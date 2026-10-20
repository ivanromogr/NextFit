"""Launch the API with disposable H2 data and one synthetic exercise, never production.

Requires a successful Maven verify and JDK 21. No provider credentials are inherited.
Use only with the localhost browser check documented in docs/testing-general.md.
"""
from pathlib import Path
import argparse
import os
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--java-home', default=os.environ.get('JAVA_HOME'))
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
backend = root / 'Backend/backend/library'
reports = sorted((backend / 'target/surefire-reports').glob('TEST-*.xml'))
if not reports:
    raise SystemExit('Run Maven verify first to create the test runtime classpath.')
properties = {item.attrib['name']: item.attrib.get('value', '')
              for item in ET.parse(reports[0]).getroot().findall('properties/property')}
classpath = properties.get('java.class.path')
if not classpath:
    raise SystemExit('Missing test classpath in the Maven report.')
folder = Path(tempfile.gettempdir()) / 'nextfit-beta-local'
folder.mkdir(parents=True, exist_ok=True)
(folder / 'ready').unlink(missing_ok=True)
java = str(Path(args.java_home) / 'bin/java') if args.java_home else shutil.which('java')
javac = str(Path(args.java_home) / 'bin/javac') if args.java_home else shutil.which('javac')
if not java or not javac:
    raise SystemExit('JDK 21 is required; pass --java-home.')
subprocess.run([javac, '-cp', classpath, '-d', str(folder),
                str(root / 'scripts/testing/BetaLocal.java')], check=True)
settings = [
    '--spring.profiles.active=test', '--server.address=127.0.0.1', '--server.port=18080',
    '--app.cors.allowed-origins=http://127.0.0.1:4181',
    '--spring.datasource.url=jdbc:h2:mem:nextfit-beta-browser;DB_CLOSE_DELAY=-1',
    '--spring.datasource.driver-class-name=org.h2.Driver',
    '--spring.datasource.username=sa', '--spring.datasource.password=',
    '--spring.flyway.enabled=false', '--spring.jpa.hibernate.ddl-auto=create-drop',
    '--spring.jpa.show-sql=false', '--spring.jpa.open-in-view=false',
    '--app.cleanup.enabled=false', '--app.email.enabled=false',
    '--app.auth.google.enabled=false', '--app.auth.apple.enabled=false',
    '--upload.provider=local', '--app.storage.deployment-check.enabled=false',
    '--app.moderation.bootstrap.enabled=false', '--refresh-token.cookie-secure=false',
    '--upload.storage-directory=' + str(folder / 'uploads'),
]
# Child process gets no cloud/API credentials or deployment variables.
environment = {key: value for key, value in os.environ.items() if key in ('PATH', 'LANG', 'TZ')}
os.chdir(backend)
os.execve(java, [java, '-Xmx384m', '-cp', str(folder) + os.pathsep + classpath,
                   'BetaLocal'] + settings, environment)
