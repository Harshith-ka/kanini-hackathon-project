# Backend notebooks

Run from **backend** directory (or set `sys.path` so `ml` and `app` are importable).

1. **01_data_exploration.ipynb** – Load `data/triage_dataset.csv`, describe, risk distribution, vitals by risk (boxplots). Generate the dataset first with `python -m ml.train_model`.
2. **02_train_model.ipynb** – Load or generate dataset, call `ml.train_model.train()`, save model and dataset, plot feature importance.
3. **03_inference_demo.ipynb** – Load trained model, run `predict_risk()` and `get_explainability()` on a sample patient.

**Setup:** From project root, `cd backend` then `jupyter notebook notebooks/` or `pip install jupyter matplotlib` if needed.
