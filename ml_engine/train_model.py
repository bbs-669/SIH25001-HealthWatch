"""
Training pipeline for SIH25001 Outbreak Risk Prediction Model.
Generates synthetic epidemiological data tailored to rural Northeast India
and trains a scikit-learn RandomForestRegressor.
"""
import os
import sys
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error

from features import FEATURE_NAMES

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outbreak_model.joblib")


def generate_synthetic_epidemiological_data(n_samples: int = 2500, random_state: int = 42):
    """
    Generates synthetic training records reflecting water-borne disease dynamics
    in rural Assam (Brahmaputra floodplains) and Meghalaya (high-precipitation hill terrain).
    """
    np.random.seed(random_state)
    
    # 4 classes of epidemiological profiles:
    # 1. Safe / Normal baseline (40%)
    # 2. Moderate vigilance / early runoff (30%)
    # 3. High alert / monsoon contamination (20%)
    # 4. Critical outbreak / contaminated water supply (10%)
    
    n_safe = int(n_samples * 0.40)
    n_moderate = int(n_samples * 0.30)
    n_high = int(n_samples * 0.20)
    n_critical = n_samples - n_safe - n_moderate - n_high

    X_list = []
    y_list = []

    # 1. Safe profile (Target: 2 - 18)
    for _ in range(n_safe):
        d_1k = np.random.uniform(0.0, 0.8)
        v_1k = np.random.uniform(0.0, 0.4)
        f_1k = np.random.uniform(0.0, 1.0)
        j_1k = np.random.uniform(0.0, 0.1)
        sev = np.random.uniform(0.0, 0.1)
        avg_turb = np.random.uniform(1.0, 4.5)
        max_turb = avg_turb + np.random.uniform(0.0, 1.5)
        bac = 0.0 if np.random.rand() > 0.05 else 0.2
        ph_dev = np.random.uniform(0.05, 0.3)
        sms = 0 if np.random.rand() > 0.1 else 1

        score = (
            5.0
            + 2.5 * d_1k
            + 1.5 * v_1k
            + 1.0 * f_1k
            + 0.8 * avg_turb
            + 10.0 * bac
            + np.random.normal(0, 1.5)
        )
        score = np.clip(score, 1.0, 19.0)
        X_list.append([d_1k, v_1k, f_1k, j_1k, sev, avg_turb, max_turb, bac, ph_dev, sms])
        y_list.append(score)

    # 2. Moderate profile (Target: 20 - 48)
    for _ in range(n_moderate):
        d_1k = np.random.uniform(1.0, 2.5)
        v_1k = np.random.uniform(0.5, 1.8)
        f_1k = np.random.uniform(0.8, 2.5)
        j_1k = np.random.uniform(0.0, 0.4)
        sev = np.random.uniform(0.1, 0.35)
        avg_turb = np.random.uniform(5.0, 11.0)
        max_turb = avg_turb + np.random.uniform(1.0, 4.0)
        bac = 0.0 if np.random.rand() > 0.4 else 0.5
        ph_dev = np.random.uniform(0.2, 0.6)
        sms = np.random.choice([0, 1, 2])

        score = (
            22.0
            + 3.5 * d_1k
            + 2.5 * v_1k
            + 1.8 * f_1k
            + 1.2 * avg_turb
            + 14.0 * bac
            + 12.0 * sev
            + np.random.normal(0, 2.0)
        )
        score = np.clip(score, 20.0, 48.5)
        X_list.append([d_1k, v_1k, f_1k, j_1k, sev, avg_turb, max_turb, bac, ph_dev, sms])
        y_list.append(score)

    # 3. High alert profile (Target: 50 - 74)
    for _ in range(n_high):
        d_1k = np.random.uniform(2.8, 6.5)
        v_1k = np.random.uniform(1.5, 4.0)
        f_1k = np.random.uniform(1.5, 4.5)
        j_1k = np.random.uniform(0.2, 1.2)
        sev = np.random.uniform(0.3, 0.6)
        avg_turb = np.random.uniform(12.0, 22.0)
        max_turb = avg_turb + np.random.uniform(2.0, 8.0)
        bac = np.random.uniform(0.5, 1.0)
        ph_dev = np.random.uniform(0.4, 0.9)
        sms = np.random.choice([1, 2, 3, 4])

        score = (
            46.0
            + 2.8 * d_1k
            + 2.0 * v_1k
            + 5.0 * j_1k
            + 0.6 * avg_turb
            + 12.0 * bac
            + 15.0 * sev
            + 2.0 * sms
            + np.random.normal(0, 2.0)
        )
        score = np.clip(score, 50.0, 74.0)
        X_list.append([d_1k, v_1k, f_1k, j_1k, sev, avg_turb, max_turb, bac, ph_dev, sms])
        y_list.append(score)

    # 4. Critical Outbreak profile (Target: 75 - 98)
    for _ in range(n_critical):
        d_1k = np.random.uniform(6.0, 15.0)
        v_1k = np.random.uniform(3.5, 10.0)
        f_1k = np.random.uniform(2.5, 8.0)
        j_1k = np.random.uniform(0.8, 3.5)
        sev = np.random.uniform(0.5, 0.9)
        avg_turb = np.random.uniform(20.0, 45.0)
        max_turb = avg_turb + np.random.uniform(5.0, 15.0)
        bac = 1.0
        ph_dev = np.random.uniform(0.5, 1.2)
        sms = np.random.choice([2, 3, 5, 8])

        score = (
            68.0
            + 1.8 * d_1k
            + 1.5 * v_1k
            + 4.0 * j_1k
            + 0.4 * avg_turb
            + 10.0 * bac
            + 12.0 * sev
            + 1.5 * sms
            + np.random.normal(0, 2.0)
        )
        score = np.clip(score, 75.0, 99.0)
        X_list.append([d_1k, v_1k, f_1k, j_1k, sev, avg_turb, max_turb, bac, ph_dev, sms])
        y_list.append(score)

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.float32)
    return X, y


def train_and_save_model():
    print("Generating synthetic epidemiological dataset for Rural Northeast India...")
    X, y = generate_synthetic_epidemiological_data(n_samples=3000)

    # Shuffle dataset
    indices = np.arange(len(X))
    np.random.shuffle(indices)
    X = X[indices]
    y = y[indices]

    split = int(0.8 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    print(f"Training RandomForestRegressor on {len(X_train)} samples...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=9,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    print(f"Model Training Results: R² Score = {r2:.4f}, MAE = {mae:.2f}")

    # Feature Importances
    importances = model.feature_importances_
    print("\nFeature Importances:")
    for name, imp in sorted(zip(FEATURE_NAMES, importances), key=lambda x: x[1], reverse=True):
        print(f"  - {name}: {imp * 100:.1f}%")

    # Serialize model artifact
    joblib.dump(model, MODEL_PATH)
    print(f"\nModel successfully saved to: {MODEL_PATH}")
    return model


if __name__ == "__main__":
    train_and_save_model()
