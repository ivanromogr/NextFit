"""Read-only Vercel metadata check for the exact candidate commit.

Does not create deployments, bypass access protection or validate browser/API flows.
VERCEL_TOKEN is read from the environment and never printed.
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

PROJECT = 'prj_DV1DoyYpDkDArwnUxI59VZkH8MAM'
TEAM = 'team_8TgSndZQtJ1fZasKF9z8QkqG'
STABLE_ALIAS = 'next-fit-q7uo-git-codex-mobile-ux-ivanromo1708-6643s-projects.vercel.app'


class CandidateFailure(Exception):
    pass


def require(condition, message):
    if not condition:
        raise CandidateFailure(message)


def validate_deployment(deployment, commit, project=PROJECT):
    require(isinstance(deployment, dict) and isinstance(deployment.get('meta'), dict),
            'Unexpected deployment metadata')
    require(deployment['meta'].get('githubCommitSha') == commit,
            'Deployment source does not match the requested commit')
    require(deployment.get('projectId') == project, 'Deployment belongs to another project')
    require(deployment.get('target') != 'production', 'Expected an isolated preview, received production')
    state = deployment.get('readyState') or deployment.get('state')
    require(state == 'READY', f'Candidate is not ready (state: {state})')
    url = deployment.get('url', '')
    require(isinstance(url, str) and re.fullmatch(r'[a-z0-9-]+\.vercel\.app', url),
            'Unexpected deployment URL')
    return {'deployment': deployment.get('id') or deployment.get('uid'),
            'commit': commit, 'url': 'https://' + url, 'state': state,
            'scope': 'metadata only; browser/API acceptance remains pending'}



def validate_alias(alias, deployment):
    require(isinstance(alias, dict), 'Unexpected alias metadata')
    require(alias.get('alias') == STABLE_ALIAS, 'Unexpected preview alias hostname')
    require(alias.get('projectId') == PROJECT, 'Alias belongs to another project')
    require(alias.get('deploymentId') == deployment['deployment'],
            'Stable alias does not point to the exact candidate deployment')
    nested = alias.get('deployment')
    require(nested is None or isinstance(nested, dict)
            and nested.get('id') == deployment['deployment'], 'Conflicting alias deployment metadata')
    return {**deployment, 'stableAlias': 'https://' + STABLE_ALIAS}


def get_json(path, token):
    request = urllib.request.Request('https://api.vercel.com' + path,
                                     headers={'Authorization': 'Bearer ' + token})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise CandidateFailure(f'Vercel metadata API returned HTTP {error.code}') from None
    except (OSError, ValueError):
        raise CandidateFailure('Could not read valid Vercel metadata') from None


def check(commit, token, *, stable_alias=False):
    require(bool(token), 'VERCEL_TOKEN binding is missing')
    query = urllib.parse.urlencode({'projectId': PROJECT, 'teamId': TEAM, 'sha': commit, 'limit': 100})
    result = get_json('/v6/deployments?' + query, token)
    require(isinstance(result, dict) and isinstance(result.get('deployments'), list),
            'Unexpected deployment list response')
    matches = [item for item in result['deployments'] if isinstance(item, dict)
               and isinstance(item.get('meta'), dict) and item['meta'].get('githubCommitSha') == commit
               and item.get('target') != 'production']
    require(bool(matches), 'No preview exists for the requested commit; older previews do not qualify')
    ready = next((item for item in matches if (item.get('readyState') or item.get('state')) == 'READY'), None)
    require(ready is not None, 'A preview exists for this commit but is not READY')
    deployment_id = ready.get('uid') or ready.get('id')
    require(isinstance(deployment_id, str) and re.fullmatch(r'dpl_[A-Za-z0-9]+', deployment_id),
            'Unexpected deployment identifier')
    detail = get_json('/v13/deployments/' + deployment_id + '?' + urllib.parse.urlencode({'teamId': TEAM}), token)
    require(isinstance(detail, dict), 'Unexpected deployment detail response')
    candidate = validate_deployment(detail, commit)
    if stable_alias:
        alias = get_json('/v4/aliases/' + STABLE_ALIAS + '?' + urllib.parse.urlencode({'teamId': TEAM}), token)
        candidate = validate_alias(alias, candidate)
    return candidate


def commit_argument(value):
    if not re.fullmatch(r'[0-9a-fA-F]{40}', value):
        raise argparse.ArgumentTypeError('commit must be a full 40-character Git SHA')
    return value.lower()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--commit', type=commit_argument, help='defaults to the repository HEAD')
    parser.add_argument('--stable-alias', action='store_true',
                        help='also require the branch alias to point to this exact deployment')
    args = parser.parse_args(argv)
    try:
        commit = args.commit or subprocess.check_output(
            ['git', 'rev-parse', 'HEAD'], cwd=Path(__file__).resolve().parents[1], text=True).strip()
        result = check(commit, os.environ.get('VERCEL_TOKEN'), stable_alias=args.stable_alias)
    except (CandidateFailure, subprocess.SubprocessError) as error:
        print(f'FAIL candidate metadata: {error}', file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
