'use strict';

const MODES = {
    'Undefined_Off': 0,
    'Minimum_Off': 1,
    'Normal_Off': 2,
    'Maximum_Off': 3,
    'Undefined_Heating': 10,
    'Minimum_Heating': 11,
    'Normal_Heating': 12,
    'Maximum_Heating': 13,
    'Undefined_Heating_on': 20,
    'Minimum_Heating_on': 21,
    'Normal_Heating_on': 22,
    'Maximum_Heating_on': 23
};

let MODES_INVERTED = {};
for (const [key, value] of Object.entries(MODES)) {
    MODES_INVERTED[value] = key;
}
MODES_INVERTED[0] = 'normal';

const POWER_STANDBY = 50;
const POWER_NORMAL = 176;
const POWER_MAX = 256;
const POWER_HEATING = 2500;

const MODES_POWER = {
    'Undefined_Off': 0,
    'Minimum_Off': POWER_STANDBY,
    'Normal_Off': POWER_NORMAL,
    'Maximum_Off': POWER_MAX,
    'Undefined_Heating': 0,
    'Minimum_Heating': POWER_STANDBY+POWER_HEATING,
    'Normal_Heating': POWER_NORMAL+POWER_HEATING,
    'Maximum_Heating': POWER_MAX+POWER_HEATING,
    'Undefined_Heating_on': 0,
    'Minimum_Heating_on': POWER_STANDBY+POWER_HEATING,
    'Normal_Heating_on': POWER_NORMAL+POWER_HEATING,
    'Maximum_Heating_on': POWER_MAX+POWER_HEATING
};

const FAN_LEVEL_STATUS = {
    0: 'Undefined',
    1: 'Minimum',
    2: 'Normal',
    3: 'Maximum'
};

const HEATING_STATUS = {
    0: 'Off',
    10: 'Heating',
    20: 'Heating on'
};

const MODES_STATUS = {
    'Undefined_Off': '-',
    'Minimum_Off': 'Min',
    'Normal_Off': 'Norm',
    'Maximum_Off': 'Max',
    'Undefined_Heating': '-H',
    'Minimum_Heating': 'Min-H',
    'Normal_Heating': 'Norm-H',
    'Maximum_Heating': 'Max-H',
    'Undefined_Heating_on': '-H',
    'Minimum_Heating_on': 'Min-H',
    'Normal_Heating_on': 'Norm-H',
    'Maximum_Heating_on': 'Max-H'
};

module.exports = {
    MODES: MODES,
    MODES_INVERTED: MODES_INVERTED,
    MODES_POWER: MODES_POWER,
    FAN_LEVEL_STATUS: FAN_LEVEL_STATUS,
    HEATING_STATUS: HEATING_STATUS,
    MODES_STATUS: MODES_STATUS
};
