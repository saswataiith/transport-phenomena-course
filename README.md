# Transport Laboratory

A standalone, browser-only teaching application for comparing global conservation balances with spatially resolved heat, species, and momentum transport.

## Run locally

No build step or server-side solver is required. Open `dist/index.html` in a modern browser. If the browser restricts local files, serve the directory with any static web server, for example:

```bash
python3 -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`.

## Files

- `dist/index.html` — application structure and controls
- `dist/styles.css` — complete visual design and responsive layout
- `dist/app.js` — conservative one-dimensional finite-volume solver, physics modes, animation, plots, and conservation ledger

## Numerical model

The three modes are instances of the conservative scalar transport equation

```text
∂(Cφ)/∂t + ∂(Cuφ)/∂x = ∂/∂x(Γ ∂φ/∂x) + S
```

where `φ` represents temperature, concentration, or velocity. Face fluxes are shared by adjacent finite volumes, so internal fluxes cancel in the global balance. Stable explicit time steps are calculated from the diffusion and advection limits.

## Editing

The application has no external JavaScript dependencies. Change the mode definitions and physical ranges near the top of `dist/app.js`; edit controls in `dist/index.html`; and edit the visual theme in `dist/styles.css`.
