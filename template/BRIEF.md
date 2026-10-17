# Brief

Build this Figma frame as a React + Tailwind page.

- Frame: "{{TITLE}}" ({{WIDTH}} x {{HEIGHT}} px).
- Folders: this brief sits in the run folder. The app is in `app/` (all code goes there). The frozen Figma export is at `../../figma/` (`{{FIGMA}}`) and is read-only. Write your own work files (spec, tokens, renders, notes) to `work/` (`{{WORK}}`), never into the export folder or the app.
- Match the reference screenshot at `app/reference/screenshot@2x.png` as closely as you can. It is the frame at 2x.
- Make it responsive: it must work at {{NARROW}}px and {{WIDE}}px wide as well as at {{WIDTH}}px, with no horizontal scrolling and no clipped or overlapping text. A deliberate horizontal scroller (for example a chip row) is fine.
- Use the provided assets in `app/public/assets/` (reference them as `/assets/<file>`). Do not invent images or swap icons.
- Framework is fixed: Vite + React + TypeScript + Tailwind CSS v4, already set up in `app/`.
- Put the page in `app/src/Page.tsx` (split it into smaller components if that makes it clearer).
- Check your work by running `npm install` then `npm run dev` inside `app/` and comparing with the screenshot. Stop any server you start when you are done.

{{TOOL_SECTION}}
