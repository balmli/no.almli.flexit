'use strict';

const Homey = require('homey'),
    {HomeyAPI} = require('athom-api');

const ZwaveDevice = require('homey-meshdriver').ZwaveDevice;

const MODES = {
    'undefined': 0,
    'min': 1,
    'normal': 2,
    'max': 3,
    'undefined_heat': 10,
    'min_heat': 11,
    'normal_heat': 12,
    'max_heat': 13,
    'undefined_heat_on': 20,
    'min_heat_on': 21,
    'normal_heat_on': 22,
    'max_heat_on': 23
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

module.exports = class FlexitSP30Device extends ZwaveDevice {

    async onInit() {
        super.onInit();
        await this.initDevice();
        this.registerFlowCards();
    }

    async onMeshInit() {

        //this.enableDebug();
        //this.printNode();

        this.registerCapability('mode', 'SWITCH_MULTILEVEL', {
            get: 'SWITCH_MULTILEVEL_GET',
            getOpts: {
                getOnStart: true,
            },
            set: 'SWITCH_MULTILEVEL_SET',
            setParser: value => {
                this.log('mode setParser', value);
                this.updateLastChangedMode();
                return {
                    Value: MODES[value] ? MODES[value] : 0
                };
            },
            report: 'SWITCH_MULTILEVEL_REPORT',
            reportParser: report => {
                if (report &&
                    report.hasOwnProperty('Value (Raw)')) {
                    const value = report['Value (Raw)'][0];
                    const retVal = MODES_INVERTED[value] ? MODES_INVERTED[value] : null;
                    this.log('mode reportParser', value, retVal);
                    return retVal;
                }
                return null;
            }
        });

        this.addSensorCapability('fan_level_report', FAN_LEVEL_STATUS, this._fanLevelChangedTrigger, 1);
        this.addSensorCapability('heating_report', HEATING_STATUS, this._heatingChangedTrigger, 2);
        this.addTemperatureCapability('measure_temperature.in', 3);
        this.addTemperatureCapability('measure_temperature.out', 4);
        this.addTemperatureCapability('measure_temperature.house_in', 5);
        this.addTemperatureCapability('measure_temperature.house_out', 6);
    }

    addSensorCapability(capabilityId, mapping, trigger, multiChannelNodeId) {
        this.registerCapability(capabilityId, 'SENSOR_MULTILEVEL', {
            get: 'SENSOR_MULTILEVEL_GET',
            getOpts: {
                getOnStart: true
            },
            getParser: () => ({
                'Sensor Type': 'Current (version 3)',
                Properties1: {
                    Scale: 0,
                },
            }),
            report: 'SENSOR_MULTILEVEL_REPORT',
            reportParser: report => {
                if (report &&
                    report.hasOwnProperty('Sensor Value (Parsed)')) {
                    const retVal = mapping[report['Sensor Value (Parsed)']];
                    if (trigger && this.getCapabilityValue(capabilityId) !== retVal) {
                        trigger.trigger(this, {
                            value: retVal,
                            from_panel: this.modeChangedFromPanel()
                        });
                    }
                    return retVal;
                }
                return null;
            },
            multiChannelNodeId: multiChannelNodeId
        });
    }

    addTemperatureCapability(capabilityId, multiChannelNodeId) {
        this.registerCapability(capabilityId, 'SENSOR_MULTILEVEL', {
            get: 'SENSOR_MULTILEVEL_GET',
            getOpts: {
                getOnStart: true
            },
            getParser: () => ({
                'Sensor Type': 'Temperature (version 1)',
                Properties1: {
                    Scale: 0,
                }
            }),
            report: 'SENSOR_MULTILEVEL_REPORT',
            reportParser: report => {
                if (report &&
                    report.hasOwnProperty('Sensor Value (Parsed)')) {
                    return report['Sensor Value (Parsed)'];
                }
                return null;
            },
            multiChannelNodeId: multiChannelNodeId
        });
    }

    async initDevice() {
        const mode = this.getCapabilityValue('mode');
        if (!mode) {
            await this.setCapabilityValue('mode', 'normal').catch(console.error);
        }
        this.scheduleBathroomDevice();
    }

    onDeleted() {
        this.clearScheduleBathroomDevice();
        this.log('device deleted');
    }

    async registerFlowCards() {
        this._fanLevelChangedTrigger = new Homey.FlowCardTriggerDevice('fan_level_changed');
        this._fanLevelChangedTrigger.register();

        this._heatingChangedTrigger = new Homey.FlowCardTriggerDevice('heating_changed');
        this._heatingChangedTrigger.register();

        new Homey.FlowCardCondition('is_fan_level')
            .register()
            .registerRunListener((args, state) => args.device.getCapabilityValue('fan_level_report') === args.fan_level);

        new Homey.FlowCardCondition('is_heating')
            .register()
            .registerRunListener((args, state) => args.device.getCapabilityValue('heating_report') === HEATING_STATUS[10] || args.device.getCapabilityValue('heating_report') === HEATING_STATUS[20]);

        new Homey.FlowCardAction('set_mode')
            .register()
            .registerRunListener((args, state) => args.device.triggerCapabilityListener('mode', args.mode, {}));
    }

    async updateLastChangedMode() {
        await this.setStoreValue('lastChangedMode', new Date().getTime());
    }

    modeChangedFromPanel() {
        const lastChangedMode = this.getStoreValue('lastChangedMode');
        return lastChangedMode && ((new Date().getTime() - lastChangedMode) > 5000);
    }

    async getApi() {
        if (!this._api) {
            this._api = await HomeyAPI.forCurrentHomey();
        }
        return this._api;
    }

    async getDevices() {
        try {
            const api = await this.getApi();
            return await api.devices.getDevices();
        } catch (error) {
            console.error(error);
        }
    }

    scheduleBathroomDevice(seconds = 60) {
        this._bathroomDeviceTimeout = setTimeout(this.refreshBathroomDevice.bind(this), seconds * 1000);
    }

    clearScheduleBathroomDevice() {
        if (this._bathroomDeviceTimeout) {
            clearTimeout(this._bathroomDeviceTimeout);
            this._bathroomDeviceTimeout = undefined;
        }
    }

    async refreshBathroomDevice() {
        const bathroomDevice = await this.getBathroomDevice();
        if (bathroomDevice) {
            //this.log('refreshBathroomDevice', bathroomDevice);
            await this.setCapabilityValue("measure_temperature.bath", bathroomDevice.temperature).catch(console.error);
            await this.setCapabilityValue("measure_humidity.bath", bathroomDevice.humidity).catch(console.error);
        } else {
            this.log('refreshBathroomDevice: no bathroom device');
        }
        this.scheduleBathroomDevice();
    }

    async getBathroomDevice() {
        let settings = await this.getSettings();
        let bathRoomDevice = settings.bathRoomDevice;
        if (!bathRoomDevice) {
            this.log('getBathroomDevice: no bathRoomDevice in settings');
            return undefined;
        }
        bathRoomDevice = bathRoomDevice.toLowerCase();
        let devices = await this.getDevices();
        if (devices) {
            for (let device in devices) {
                let d = devices[device];
                if (d.capabilitiesObj &&
                    d.name.toLowerCase() === bathRoomDevice &&
                    (d.capabilitiesObj.measure_temperature || d.capabilitiesObj.measure_humidity)) {
                    return {
                        temperature: d.capabilitiesObj.measure_temperature ? d.capabilitiesObj.measure_temperature.value : undefined,
                        humidity: d.capabilitiesObj.measure_humidity ? d.capabilitiesObj.measure_humidity.value : undefined
                    }
                }
            }
        }
        return undefined;
    }

};
