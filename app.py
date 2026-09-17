from flask import Flask, render_template, request, jsonify
from collections import defaultdict, Counter
import requests

app = Flask(__name__)

API_KEY = "0091b17212d7061aa4c2f8f52bbd61d1"

CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/weather")
def weather():

    city = request.args.get("city", "").strip()

    if not city:
        return jsonify({
            "message": "Please enter a city name."
        }), 400

    params = {
        "q": city,
        "appid": API_KEY,
        "units": "metric"
    }

    try:

        response = requests.get(
            CURRENT_URL,
            params=params,
            timeout=10
        )

        data = response.json()

        return jsonify(data), response.status_code

    except requests.exceptions.RequestException:

        return jsonify({
            "message": "Could not connect to the weather service."
        }), 500


@app.route("/forecast")
def forecast():

    city = request.args.get("city", "").strip()

    if not city:
        return jsonify({
            "message": "Please enter a city name."
        }), 400

    params = {
        "q": city,
        "appid": API_KEY,
        "units": "metric"
    }

    try:

        response = requests.get(
            FORECAST_URL,
            params=params,
            timeout=10
        )

        data = response.json()

        if response.status_code != 200:
            return jsonify(data), response.status_code

        days = aggregate_forecast(data.get("list", []))

        city_info = data.get("city", {})

        return jsonify({
            "city": {
                "name": city_info.get("name"),
                "country": city_info.get("country"),
                "sunrise": city_info.get("sunrise"),
                "sunset": city_info.get("sunset")
            },
            "days": days
        }), 200

    except requests.exceptions.RequestException:

        return jsonify({
            "message": "Could not connect to the weather service."
        }), 500


def aggregate_forecast(entries):
    """
    Groups the 3-hour forecast entries by calendar date and reduces
    each day down to the stats the frontend needs: temp range,
    average humidity/wind, peak chance of rain, a representative
    (closest-to-midday) icon/description, and the raw hourly points
    for the expandable forecast row and the Home screen's strip.
    """

    by_date = defaultdict(list)

    for entry in entries:
        date_key = entry["dt_txt"].split(" ")[0]
        by_date[date_key].append(entry)

    days = []

    for date_key in sorted(by_date.keys())[:5]:

        day_entries = by_date[date_key]

        temps = [e["main"]["temp"] for e in day_entries]
        humidities = [e["main"]["humidity"] for e in day_entries]
        wind_speeds = [e["wind"]["speed"] for e in day_entries]
        pops = [e.get("pop", 0) for e in day_entries]

        def hour_of(entry):
            return int(entry["dt_txt"].split(" ")[1].split(":")[0])

        representative = min(
            day_entries,
            key=lambda e: abs(hour_of(e) - 13)
        )

        main_counts = Counter(
            e["weather"][0]["main"] for e in day_entries
        )
        dominant_main = main_counts.most_common(1)[0][0]

        hourly = [
            {
                "time": e["dt_txt"].split(" ")[1][:5],
                "temp": round(e["main"]["temp"]),
                "icon": e["weather"][0]["icon"],
                "main": e["weather"][0]["main"]
            }
            for e in day_entries
        ]

        days.append({
            "date": date_key,
            "min_temp": round(min(temps)),
            "max_temp": round(max(temps)),
            "avg_humidity": round(sum(humidities) / len(humidities)),
            "avg_wind": round(sum(wind_speeds) / len(wind_speeds), 1),
            "max_pop": round(max(pops) * 100),
            "icon": representative["weather"][0]["icon"],
            "main": dominant_main,
            "description": representative["weather"][0]["description"],
            "hourly": hourly
        })

    return days


if __name__ == "__main__":
    app.run(debug=True)
