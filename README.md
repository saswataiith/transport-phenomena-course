# Transport Laboratory

A standalone, browser-only teaching application for comparing global conservation balances with spatially resolved heat, species, and momentum transport.

## Run locally

No build step or server-side solver is required. Open `index.html` in a modern browser. If the browser restricts local files, serve the directory with any static web server, for example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Files

- `index.html` — application structure and controls
- `styles.css` — complete visual design and responsive layout
- `app.js` — conservative one-dimensional finite-volume solver, physics modes, animation, plots, and conservation balance

## Numerical model

The three modes are instances of the conservative scalar transport equation

```text
∂(Cφ)/∂t + ∂(Cuφ)/∂x = ∂/∂x(Γ ∂φ/∂x) + S
```

where `φ` represents temperature, concentration, or velocity. Face fluxes are shared by adjacent finite volumes, so internal fluxes cancel in the global balance. Stable explicit time steps are calculated from the diffusion and advection limits.

## Editing

The application has no external JavaScript dependencies. `quantities.js` defines the quantity and unit tables for each process and worked example. Change the mode definitions and physical ranges near the top of `app.js`; edit controls in `index.html`; and edit the visual theme in `styles.css`.
