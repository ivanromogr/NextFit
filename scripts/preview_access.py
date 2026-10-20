"""Restrict Vercel automation credentials to the authorized preview origin."""
from urllib.parse import urlsplit

PREVIEW_HOST = 'next-fit-q7uo-git-codex-mobile-ux-ivanromo1708-6643s-projects.vercel.app'
HEADER = 'x-vercel-protection-bypass'


def preview_headers(url, headers, secret):
    result = {key: value for key, value in headers.items() if key.lower() != HEADER}
    parsed = urlsplit(url)
    if (secret and parsed.scheme == 'https' and parsed.netloc == PREVIEW_HOST
            and not parsed.username and not parsed.password):
        result[HEADER] = secret
    return result
