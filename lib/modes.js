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

module.exports = {
    MODES: MODES,
    MODES_INVERTED: MODES_INVERTED,
    FAN_LEVEL_STATUS: FAN_LEVEL_STATUS,
    HEATING_STATUS: HEATING_STATUS
};
