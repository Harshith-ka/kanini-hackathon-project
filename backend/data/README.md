# Triage dataset

- **triage_dataset.csv** – Generated when you run `python -m ml.train_model` from the backend directory. Contains synthetic triage records with vitals, symptoms, and risk labels (low / medium / high).
- Columns: age, gender, heart_rate, blood_pressure_systolic, blood_pressure_diastolic, temperature, spo2, risk, symptom_* (binary).
- You can also generate it from the **notebooks** (e.g. `02_train_model.ipynb`).
