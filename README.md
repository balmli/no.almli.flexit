# Flexit SP30 panel app for Athom Homey

With this app, a [Z-UNO z-wave](https://z-uno.z-wave.me/technical/) and some [extra hardware](https://github.com/balmli/no.almli.flexit.zuno), you can control your Flexit SP30 control panel.

You can control the fan level (Minimum, Normal, Maximum) and the heating (On, Off).

Use cases:

- The ventilation system is turned on for 30 minutes each morning.
- The ventilation system is turned on if the humidity in the bathroom changes more than 5 percentage within 5 minutes.
- The ventilation system is turned on if the CO2 - level is too high.
- The ventilation system is turned on from the SP30 panel (to Normal or Maximum), and then automatically turned off after 1 hour.


## Device: Flexit SP30 

<img src="https://balmli.github.io/no.almli.flexit/app_1.png" width="250" height="541">
<img src="https://balmli.github.io/no.almli.flexit/app_2.png" width="250" height="541">

#### Sensors

- Fan level status
- Heating status
- Temperature: Bathroom
- Humidity: Bathroom
- Temperature: Air from outside
- Temperature: Air to outside
- Temperature: Air to house
- Temperature: Air from house

#### Triggers

- Fan level changed (tokens: value, from_panel)
- Heating changed (tokens: value, from_panel)

#### Conditions

- Is fan level (Minimum, Normal, Maximum)
- Is heating on / off

#### Actions

- Set mode (Minimum, Normal, Maximum, Normal/Heat, Maximum/Heat)


## Advanced settings:

#### Device specific

- Fan level status report interval (s)
- Temperature report interval (s)
- Temperature report threshold (°C)
- Relay on duration (ms)

#### Temperature sensor calibration

- Air from outside temperature sensor calibration (°C)
- Air to outside temperature sensor calibration (°C)
- Air to house temperature sensor calibration (°C)
- Air from house temperature sensor calibration (°C

#### Bathroom device

- Name of the temperature/humidity device on the bathroom
- Report interval (s)


## Required hardware and firmware for Z-UNO

Click [here](https://github.com/balmli/no.almli.flexit.zuno) for the Z-UNO firmware and information about the required hardware.


## Disclaimer:

Use at your own risk. I accept no responsibility for any damages caused by using this app.


## Release Notes:

#### 0.0.3

- Initial version
