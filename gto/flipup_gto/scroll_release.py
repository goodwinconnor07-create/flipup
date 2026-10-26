"""Deployment controls only. No poker calculations or credentials in diagnostics."""
import os
from .scroll_contract import fingerprint


def publication_enabled():
    return os.environ.get('FLIPUP_SCROLL_PUBLISH_ENABLED') == '1'


def require_publication(validation, profiles):
    if not publication_enabled():
        raise ValueError('Scroll publication is disabled until launch validation is reviewed')
    if not isinstance(validation, dict) or validation.get('passed') is not True or validation.get('engine') != fingerprint():
        raise ValueError('current independent laptop validation is required')
    coverage=validation.get('coverage', [])
    for players, street in profiles:
        if [players, street] not in coverage:
            raise ValueError('player/street profile has no passing independent reference')


def readiness():
    return dict(ok=True, service='flipup-gto', engine=fingerprint(),
                scrollPublicationEnabled=publication_enabled(),
                supportedModel=dict(players=[2,3], utility='chip-ev', rake=False,
                                    equalRootStacks=True),
                externalValidationRequired=True)
