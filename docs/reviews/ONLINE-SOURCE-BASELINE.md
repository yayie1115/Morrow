# Online source baseline

The repository now follows the deployed split frontend: `static/index.html` references versioned JS/CSS bundles. Edit `static/app.src.js` and `static/app.src.css`, then run `python build_assets.py` to regenerate the referenced assets.

The active presence engine, optional reasoning translation worker, option tools, and licensed vendored jiwen runtime are included. Operator diagnostics, backups, databases, credentials, and uploads are excluded. Presence runner and build paths are relative to the checkout; deployed behavior is preserved.

Frontend contract tests expand the entry page with the JS/CSS assets it actually references. Presence fixtures use explicit column names and tolerate the engine tables created during application initialization.

The deployed proactive protocol requires a message and permits one retry after silence only if no tool actions or material output occurred. This is retained as part of the deployed baseline, rather than replaced by an earlier local implementation.
