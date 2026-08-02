# UK Intercity Railway Network Controller — Hardware I/O & Memory Allocation

## Digital Inputs (%IX)
* `%I0.0` - `DI_ESTOP_NC`: Master Railway Emergency Stop switch (NC 24VDC).
* `%I0.1` - `DI_MASTER_RUN`: Master Plant / Timetable Run Pushbutton.
* `%I0.2` - `DI_RESET_FAULT`: Alarm Reset Pushbutton.
* `%I0.3` - `DI_AXLE_LONDON`: Track Circuit Axle Counter - London Block.
* `%I0.4` - `DI_AXLE_BRUM`: Track Circuit Axle Counter - Birmingham Block.
* `%I0.5` - `DI_AXLE_MANCHESTER`: Track Circuit Axle Counter - Manchester Block.
* `%I0.6` - `DI_AXLE_EDINBURGH`: Track Circuit Axle Counter - Edinburgh Block.
* `%I0.7` - `DI_POINT_ALIGN_MAIN`: Point Switch Limit Switch (Main Line).

## Analog Inputs (%IW)
* `%IW100` - `AI_TRACTION_SPEED1`: Speed Radar Sensor - Train 1 (0-220 km/h).
* `%IW102` - `AI_TRACTION_SPEED2`: Speed Radar Sensor - Train 2 (0-220 km/h).

## Digital Outputs (%QX)
* `%Q0.0` - `DO_SIGNAL_LONDON`: Signal Aspect LED Green - London Block.
* `%Q0.1` - `DO_SIGNAL_BRUM`: Signal Aspect LED Green - Birmingham Block.
* `%Q0.2` - `DO_SIGNAL_MANCH`: Signal Aspect LED Green - Manchester Block.
* `%Q0.3` - `DO_SIGNAL_SCOTLAND`: Signal Aspect LED Green - Scotland Border Block.
* `%Q0.4` - `DO_POINT_MAIN`: Point Switch Motor Contactor (Main Line).
* `%Q0.5` - `DO_POINT_BRANCH`: Point Switch Motor Contactor (Branch Line).
* `%Q0.6` - `DO_PLATFORM_BUZZER`: Platform Departure Chime.
* `%Q0.7` - `DO_SAFETY_RELAY`: 25kV Overhead Catenary Power Relay.

## Analog Outputs (%QW)
* `%QW100` - `AQ_VFD_SPEED1`: VFD Traction Speed Reference - Train 1 (0-100%).
* `%QW102` - `AQ_VFD_SPEED2`: VFD Traction Speed Reference - Train 2 (0-100%).
