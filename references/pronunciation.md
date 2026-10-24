# Pronunciation dictionary

The script is written with on-screen spelling. The voice needs spoken spelling. The dictionary maps one to the other just before synthesis, and the captions keep the on-screen form.

```json
{
  "mermandraw.com": "Merman Draw dot com",
  "MermanDraw": "Merman Draw",
  "_wrong": {
    "Merman Draw": ["mermaid draw", "merman drew"]
  }
}
```

## Where it lives

1. `guides/<name>/pronunciation.json`: this guide's products and names.
2. `<skill>/references/pronunciation.json`: shared entries for every guide.

The guide's file wins on a conflict.

## Rules

- Keys match whole words as they appear in the script, punctuation aside. Longer keys are applied first, so `mermandraw.com` wins over `MermanDraw`.
- Values are what the voice should say. Spell it phonetically if needed ("Kubernetes" → "Koo ber net ees").
- `_wrong` maps a spoken form to strings that mean the voice got it wrong. `stg verify` counts each one in the transcript and reports it.
- Fix pronunciation here, never by changing the narration. The captions must show what the screen shows.

## Workflow

1. Synthesize. 2. `stg verify <name>`. 3. For each hit or odd word in `recordings/narration.stt.txt`, add an entry. 4. Synthesize again; only the scenes with that word are redone.
