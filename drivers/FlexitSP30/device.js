'use strict';

const Homey = require('homey'),
    modes = require('../../lib/modes');

const ZwaveDevice = require('homey-meshdriver').ZwaveDevice;

module.exports = class FlexitSP30Device extends ZwaveDevice {

    async onInit() {
        this._fanLevelChangedTrigger = undefined;
        this._heatingChangedTrigger = undefined;
        super.onInit();
        await this.initDevice();
        this.registerFlowCards();
        this.log(`device initialized: ${this.getData().id}`);
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
                    Value: modes.MODES[value] ? modes.MODES[value] : 0
                };
            },
            report: 'SWITCH_MULTILEVEL_REPORT',
            reportParser: report => {
                if (report && report.hasOwnProperty('Value (Raw)')) {
                    const value = report['Value (Raw)'][0];
                    return modes.MODES_INVERTED[value] ? modes.MODES_INVERTED[value] : null;
                }
                return null;
            }
        });

        this.addSensorCapability('fan_level_report', modes.FAN_LEVEL_STATUS, this._fanLevelChangedTrigger, 1);
        this.addSensorCapability('heating_report', modes.HEATING_STATUS, this._heatingChangedTrigger, 2);
        this.addTemperatureCapability('measure_temperature.in', 3);
        this.addTemperatureCapability('measure_temperature.out', 4);
        this.addTemperatureCapability('measure_temperature.house_in', 5);
        this.addTemperatureCapability('measure_temperature.house_out', 6);

        this.registerSetting('Device_enabled', value => {
            const bufferValue = new Buffer(2);
            bufferValue.writeUInt16BE(value === true ? 0x0001 : 0x0000);
            return bufferValue;
        });

        this.registerSetting('Relays_enabled', value => {
            const bufferValue = new Buffer(2);
            bufferValue.writeUInt16BE(value === true ? 0x0001 : 0x0000);
            return bufferValue;
        });

        await this.enableDevice(true);
    }

    addSensorCapability(capabilityId, mapping, trigger, multiChannelNodeId) {
        this.registerCapability(capabilityId, 'SENSOR_MULTILEVEL', {
            get: 'SENSOR_MULTILEVEL_GET',
            getOpts: {
                getOnStart: false
            },
            getParser: () => ({
                'Sensor Type': 'Current (version 3)',
                Properties1: {
                    Scale: 0,
                },
            }),
            report: 'SENSOR_MULTILEVEL_REPORT',
            reportParser: report => {
                if (report && report.hasOwnProperty('Sensor Value (Parsed)')) {
                    const retVal = mapping[report['Sensor Value (Parsed)']];
                    if (trigger && this.getCapabilityValue(capabilityId) !== retVal) {
                        trigger.trigger(this, {value: retVal, from_panel: this.modeChangedFromPanel()});
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
                getOnStart: false
            },
            getParser: () => ({
                'Sensor Type': 'Temperature (version 1)',
                Properties1: {
                    Scale: 0,
                }
            }),
            report: 'SENSOR_MULTILEVEL_REPORT',
            reportParser: report => {
                setTimeout(this.calcHeatEfficiency.bind(this), 1000);
                if (report && report.hasOwnProperty('Sensor Value (Parsed)')) {
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
            await this.setCapabilityValue('mode', 'Normal_Off').catch(console.error);
        }
    }

    async onAdded() {
        this.log(`device added: ${this.getData().id}`);
    }

    onDeleted() {
        this.log(`device deleted: ${this.getData().id}`);
    }

    async enableDevice(enabled) {
        await this.configurationSet({id: 'Device_enabled'}, enabled);
        await this.setSettings({'Device_enabled': enabled});
        this.log(`enableDevice: ${enabled ? 'enabled' : 'disabled'}`);
    }

    async registerFlowCards() {
        this._fanLevelChangedTrigger = new Homey.FlowCardTriggerDevice('fan_level_changed');
        this._fanLevelChangedTrigger.register();

        this._heatingChangedTrigger = new Homey.FlowCardTriggerDevice('heating_changed');
        this._heatingChangedTrigger.register();

        this.triggerMeasureTemperatureIn = new Homey.FlowCardTriggerDevice('measure_temperature.in_changed');
        this.triggerMeasureTemperatureIn
            .register();

        this.triggerMeasureTemperatureOut = new Homey.FlowCardTriggerDevice('measure_temperature.out_changed');
        this.triggerMeasureTemperatureOut
            .register();

        this.triggerMeasureTemperatureHouseIn = new Homey.FlowCardTriggerDevice('measure_temperature.house_in_changed');
        this.triggerMeasureTemperatureHouseIn
            .register();

        this.triggerMeasureTemperatureHouseOut = new Homey.FlowCardTriggerDevice('measure_temperature.house_out_changed');
        this.triggerMeasureTemperatureHouseOut
            .register();

        new Homey.FlowCardCondition('is_fan_level')
            .register()
            .registerRunListener(args => args.device.getCapabilityValue('fan_level_report') === args.fan_level);

        new Homey.FlowCardCondition('is_heating')
            .register()
            .registerRunListener(args => args.device.getCapabilityValue('heating_report') === modes.HEATING_STATUS[10] ||
                args.device.getCapabilityValue('heating_report') === modes.HEATING_STATUS[20]);

        new Homey.FlowCardAction('set_mode')
            .register()
            .registerRunListener(args => args.device.triggerCapabilityListener('mode', args.mode, {}));

        new Homey.FlowCardAction('calibrate_temp')
            .register()
            .registerRunListener(this.calibrateTemperatureSensors.bind(this));
    }

    async updateLastChangedMode() {
        await this.setStoreValue('lastChangedMode', new Date().getTime());
    }

    modeChangedFromPanel() {
        const lastChangedMode = this.getStoreValue('lastChangedMode');
        return lastChangedMode && ((new Date().getTime() - lastChangedMode) > 5000);
    }

    async calcHeatEfficiency() {
        const q1 = this.getCapabilityValue('measure_temperature.in');
        const q2 = this.getCapabilityValue('measure_temperature.house_in');
        const q3 = this.getCapabilityValue('measure_temperature.house_out');
        const n = q3 - q1 !== 0 ? Math.round(10000 * (q2 - q1) / (q3 - q1)) / 100 : null;
        this.log(`calcHeatEfficiency: (${q2} - ${q1}) / (${q3} - ${q1}) -> ${n}`);
        await this.setCapabilityValue('heat_efficiency', n);
    }

    async calibrateTemperatureSensors(args, state) {
        if (!args.temperature) {
            throw new Error('Missing temperature');
        }
        let settings = await this.getSettings();
        await this.calibrateTemperatureSensor('measure_temperature.in', 'Temp1_sensor_calibration', args.temperature, settings);
        await this.calibrateTemperatureSensor('measure_temperature.out', 'Temp2_sensor_calibration', args.temperature, settings);
        await this.calibrateTemperatureSensor('measure_temperature.house_in', 'Temp3_sensor_calibration', args.temperature, settings);
        await this.calibrateTemperatureSensor('measure_temperature.house_out', 'Temp4_sensor_calibration', args.temperature, settings);
    }

    async calibrateTemperatureSensor(capability, settingsProperty, targetTemp, settings) {
        const currentCalibration = settings[settingsProperty];
        const realTemperature = this.getCapabilityValue(capability) - currentCalibration / 100;
        const newCalibration = Math.round(100 * (targetTemp - realTemperature));

        await this.setSettings(JSON.parse(`{ ${settingsProperty}: ${newCalibration} }`));
        await this.configurationSet({id: settingsProperty}, newCalibration);
    }

};
