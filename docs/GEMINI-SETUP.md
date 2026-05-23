# Google AI Studio (Gemini) setup

## 1. Get an API key

1. Open [Google AI Studio](https://aistudio.google.com/apikey).
2. Create an API key for your Google Cloud / AI Studio project.
3. Copy the key (starts with `AIza...`).

## 2. Add to `.env`

In the project root `C:\Users\dan25\projects\photobooth\.env`:

```env
GEMINI_API_KEY="AIzaSy...your-key-here"
GEMINI_IMAGE_MODEL="gemini-3-pro-image-preview"
```

This is the default (**Nano Banana Pro**, `gemini-3-pro-image-preview`). Per-booth choice is in **Admin → instance → AI image model** (Nano Banana 2 = `gemini-3.1-flash-image-preview` for speed).

See the [Pro model docs](https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image-preview) and [Flash Image docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image-preview).

## 3. Restart services

The key is read by the **API** (upload) and **worker** (AI jobs):

```powershell
# Stop and restart both terminals:
pnpm --filter @photobooth/api dev
pnpm --filter @photobooth/worker dev
```

## 4. Test

1. Open the booth, take a photo, pick a filter.
2. Wait for processing — you should get a styled **1200×1800** JPEG (6×4″ @ 300 DPI).
3. If the worker log shows Gemini errors, verify the model name and that billing/API is enabled on your Google project.

## Print size

Output is fixed to **6×4 inch portrait** (4″ × 6″, 1200×1800 px at 300 DPI). The booth camera preview uses the same **2:3** aspect ratio.
