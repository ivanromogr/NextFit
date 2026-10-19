#!/usr/bin/env python3
"""Real PostgreSQL migration checks with a disposable Docker database and built JAR.
No production credentials or databases are used. Requires Java 21 and Docker.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[2]
JAR = ROOT / 'Backend/backend/library/target/library-0.0.1-SNAPSHOT.jar'
CONTAINER = 'nextfit-migration-check-' + uuid.uuid4().hex[:10]
IMAGE = 'postgres:16-alpine'
processes = []


def run(*args):
    return subprocess.run(args, check=True, text=True, capture_output=True).stdout.strip()


def sql(database, statement):
    return run('docker', 'exec', CONTAINER, 'psql', '-U', 'nextfit_fixture', '-d', database,
               '-v', 'ON_ERROR_STOP=1', '-tAc', statement)


def stop(process):
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def start(database, extra=(), should_fail=False):
    log_path = Path(work) / (database + '-' + uuid.uuid4().hex[:6] + '.log')
    args = [os.environ.get('JAVA', 'java'), '-jar', str(JAR), '--spring.profiles.active=render',
            '--server.port=0', '--upload.provider=local', '--upload.storage-directory=' + work + '/uploads',
            '--spring.datasource.url=jdbc:postgresql://127.0.0.1:' + port + '/' + database,
            '--spring.datasource.username=nextfit_fixture', '--spring.datasource.password=local-fixture-only',
            '--jwt.secret=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
            '--app.moderation.bootstrap.enabled=false', '--spring.sql.init.mode=never',
            '--app.cleanup.enabled=false', '--spring.flyway.enabled=true',
            '--spring.flyway.baseline-on-migrate=false', '--spring.jpa.hibernate.ddl-auto=validate']
    overridden = {argument.split('=', 1)[0] for argument in extra}
    args = [argument for argument in args if argument.split('=', 1)[0] not in overridden] + list(extra)
    with log_path.open('w') as log:
        process = subprocess.Popen(args, stdout=log, stderr=subprocess.STDOUT)
    processes.append(process)
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        text = log_path.read_text()
        if process.poll() is not None:
            if should_fail and process.returncode != 0:
                return process, text
            raise RuntimeError('Isolated fixture application failed:\n' + text[-5000:])
        if 'Started BackendApplication' in text:
            if should_fail:
                raise AssertionError('Unsafe migration unexpectedly started')
            import re
            http_port = re.search(r'Tomcat started on port (\d+)', text).group(1)
            with urllib.request.urlopen('http://127.0.0.1:' + http_port + '/actuator/health', timeout=5) as response:
                assert response.status == 200 and json.load(response)['status'] == 'UP'
            return process, text
        time.sleep(0.25)
    raise TimeoutError('Application did not finish migration startup')


if not JAR.is_file():
    raise SystemExit('Build the backend JAR before running this check.')
try:
    with tempfile.TemporaryDirectory(prefix='nextfit-migration-check-') as work:
        run('docker', 'run', '-d', '--rm', '--name', CONTAINER, '-p', '127.0.0.1::5432',
            '-e', 'POSTGRES_USER=nextfit_fixture', '-e', 'POSTGRES_PASSWORD=local-fixture-only',
            '-e', 'POSTGRES_DB=nextfit_fresh', IMAGE)
        published = json.loads(run('docker', 'inspect', CONTAINER))[0]['NetworkSettings']['Ports']['5432/tcp']
        port = published[0]['HostPort']
        for attempt in range(80):
            try:
                sql('nextfit_fresh', 'SELECT 1')
                break
            except subprocess.CalledProcessError:
                time.sleep(0.25)
        else:
            raise RuntimeError('PostgreSQL not ready')
        process, _ = start('nextfit_fresh')
        assert sql('nextfit_fresh', 'SELECT version FROM flyway_schema_history WHERE success') == '1'
        assert sql('nextfit_fresh', "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'") == '29'
        sql('nextfit_fresh', "INSERT INTO chat_blocks (owner_id,target_id,created_at) VALUES ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',now())")
        stop(process)
        process, _ = start('nextfit_fresh')
        assert sql('nextfit_fresh', 'SELECT count(*) FROM chat_blocks') == '1'
        assert sql('nextfit_fresh', 'SELECT count(*) FROM flyway_schema_history') == '1'
        stop(process)
        print('PASS: empty database migration, Hibernate validation, restart preserves data and migration history')

        sql('nextfit_fresh', 'CREATE DATABASE nextfit_existing')
        sql('nextfit_existing', 'CREATE TABLE preexisting_data (id integer PRIMARY KEY); INSERT INTO preexisting_data VALUES (7)')
        _, log = start('nextfit_existing', should_fail=True)
        assert 'non-empty schema' in log and 'baseline' in log
        assert sql('nextfit_existing', 'SELECT id FROM preexisting_data') == '7'
        print('PASS: nonempty database refused without an explicit reviewed baseline')

        sql('nextfit_fresh', 'CREATE DATABASE nextfit_legacy')
        process, _ = start('nextfit_legacy', extra=('--spring.flyway.enabled=false', '--spring.jpa.hibernate.ddl-auto=create'))
        sql('nextfit_legacy', "INSERT INTO chat_blocks (owner_id,target_id,created_at) VALUES ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',now())")
        stop(process)
        process, _ = start('nextfit_legacy', extra=('--spring.flyway.baseline-on-migrate=true',))
        assert sql('nextfit_legacy', "SELECT type FROM flyway_schema_history WHERE version='1'") == 'BASELINE'
        assert sql('nextfit_legacy', 'SELECT count(*) FROM chat_blocks') == '1'
        stop(process)
        process, _ = start('nextfit_legacy')
        assert sql('nextfit_legacy', 'SELECT count(*) FROM chat_blocks') == '1'
        stop(process)
        print('PASS: explicit baseline on a reviewed legacy fixture preserves data and survives normal restart')

        sql('nextfit_fresh', 'UPDATE flyway_schema_history SET checksum=checksum+1 WHERE version=\'1\'')
        _, log = start('nextfit_fresh', should_fail=True)
        assert 'checksum mismatch' in log
        assert sql('nextfit_fresh', 'SELECT count(*) FROM chat_blocks') == '1'
        print('PASS: checksum mismatch fails startup without changing application data')
finally:
    for process in processes:
        stop(process)
    subprocess.run(['docker', 'stop', CONTAINER], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
