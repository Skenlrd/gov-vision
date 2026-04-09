from __future__ import annotations

import argparse
import sys
from pathlib import Path

import joblib
import pandas as pd


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Plot a Prophet forecast model for a department or org."
    )
    parser.add_argument(
        "--dept",
        default="FI001",
        help="Department id used in model filename, e.g. FI001 or org",
    )
    parser.add_argument(
        "--target",
        default="volume",
        choices=["volume", "delay"],
        help="Forecast target: volume (decision count) or delay (cycle time hours)",
    )
    parser.add_argument(
        "--periods",
        type=int,
        default=30,
        help="Number of future days to forecast",
    )
    parser.add_argument(
        "--history-days",
        type=int,
        default=180,
        help="Number of recent historical days to display before forecast start",
    )
    parser.add_argument(
        "--model-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "models",
        help="Directory containing prophet_*.pkl models",
    )
    parser.add_argument(
        "--save",
        type=Path,
        default=None,
        help="Optional image path to save plot (example: output/FI001.png)",
    )
    parser.add_argument(
        "--no-show",
        action="store_true",
        help="Do not open an interactive chart window",
    )
    parser.add_argument(
        "--no-band",
        action="store_true",
        help="Hide confidence band for a cleaner plot",
    )
    return parser.parse_args()


def load_pyplot():
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        print(
            "matplotlib is not installed. Run: pip install matplotlib",
            file=sys.stderr,
        )
        sys.exit(1)
    return plt


def main() -> int:
    args = parse_args()

    if args.periods < 1:
        print("--periods must be >= 1", file=sys.stderr)
        return 1
    if args.history_days < 1:
        print("--history-days must be >= 1", file=sys.stderr)
        return 1

    model_prefix = "prophet" if args.target == "volume" else "prophet_delay"
    model_path = args.model_dir / f"{model_prefix}_{args.dept}.pkl"
    if not model_path.exists():
        print(f"Model not found: {model_path}", file=sys.stderr)
        return 1

    model = joblib.load(model_path)
    future = model.make_future_dataframe(periods=args.periods, freq="D")
    forecast = model.predict(future).sort_values("ds")

    history = model.history[["ds", "y"]].copy().sort_values("ds")
    history["ds"] = history["ds"].dt.tz_localize(None)
    split_date = history["ds"].max()
    history_start = split_date - pd.Timedelta(days=args.history_days)
    history_plot = history[history["ds"] >= history_start].copy()

    forecast["ds"] = forecast["ds"].dt.tz_localize(None)
    future_only = forecast[forecast["ds"] > split_date].copy()
    future_only["yhat_lower_plot"] = future_only["yhat_lower"].clip(lower=0)
    future_only["yhat_plot"] = future_only["yhat"].clip(lower=0)

    plt = load_pyplot()
    plt.figure(figsize=(12, 5))
    plt.plot(
        history_plot["ds"],
        history_plot["y"],
        color="#1f1f1f",
        linewidth=1.4,
        label="Historical actual",
    )
    plt.plot(
        future_only["ds"],
        future_only["yhat_plot"],
        color="#1f77b4",
        linewidth=2,
        label="Forecast",
    )
    if not args.no_band:
        plt.fill_between(
            future_only["ds"],
            future_only["yhat_lower_plot"],
            future_only["yhat_upper"],
            alpha=0.15,
            color="#1f77b4",
            label="95% confidence",
        )
    plt.axvline(split_date, color="#808080", linestyle="--", linewidth=1.2, label="Forecast start")
    ylabel = "Decision Volume" if args.target == "volume" else "Avg Cycle Time (hours)"
    plt.title(f"Prophet {args.target.title()} Forecast - {args.dept}")
    plt.xlabel("Date")
    plt.ylabel(ylabel)
    plt.grid(alpha=0.2)
    plt.legend()
    plt.tight_layout()

    if args.save is not None:
        args.save.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(args.save, dpi=150)
        print(f"Saved chart: {args.save}")

    if not args.no_show:
        plt.show()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
