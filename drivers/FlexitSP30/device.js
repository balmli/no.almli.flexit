'use strict';

const Homey = require('homey'),
    {HomeyAPI} = require('athom-api'),
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
                if (report &&
                    report.hasOwnProperty('Value (Raw)')) {
                    const value = report['Value (Raw)'][0];
                    const retVal = modes.MODES_INVERTED[value] ? modes.MODES_INVERTED[value] : null;
                    this.log('mode reportParser', value, retVal);
                    return retVal;
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

        /*
        await this.configurationSet({index: 64, size: 2}, 30);  // Status report interval
        await this.configurationSet({index: 65, size: 2}, 60);  // Temperature report interval
        await this.configurationSet({index: 66, size: 2}, 2);   // Temperature report threshold
        await this.configurationSet({index: 67, size: 2}, 500); // Relay duration
        await this.configurationSet({index: 70, size: 2}, 0);   // Temp1 sensor calibration
        await this.configurationSet({index: 71, size: 2}, 0);   // Temp2 sensor calibration
        await this.configurationSet({index: 72, size: 2}, 0);   // Temp3 sensor calibration
        await this.configurationSet({index: 73, size: 2}, 0);   // Temp4 sensor calibration
        */
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
                    if (this.getCapabilityValue(capabilityId) !== retVal) {
                        if (trigger) {
                            trigger.trigger(this, {
                                value: retVal,
                                from_panel: this.modeChangedFromPanel()
                            });
                        }
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
            await this.setCapabilityValue('mode', 'Normal_Off').catch(console.error);
        }
        this.scheduleBathroomDevice();
    }

    async onSettings(oldSettingsObj, newSettingsObj, changedKeysArr) {
        await super.onSettings(oldSettingsObj, newSettingsObj, changedKeysArr);
        if (changedKeysArr.includes('bathRoomDevice_report_interval')) {
            this.scheduleBathroomDevice();
        }
    }

    async onAdded() {
        this.log(`device added: ${this.getData().id}`);
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
            .registerRunListener(args => args.device.isFanLevel(args.fan_level));

        new Homey.FlowCardCondition('is_heating')
            .register()
            .registerRunListener(args => args.device.isHeating());

        new Homey.FlowCardAction('set_mode')
            .register()
            .registerRunListener(args => args.device.triggerCapabilityListener('mode', args.mode, {}));
    }

    isFanLevel(fan_level) {
        return this.getCapabilityValue('fan_level_report') === fan_level;
    }

    isHeating() {
        const heating_report = this.getCapabilityValue('heating_report');
        return heating_report === modes.HEATING_STATUS[10] || heating_report === modes.HEATING_STATUS[20];
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

    async scheduleBathroomDevice() {
        this.clearScheduleBathroomDevice();
        let settings = await this.getSettings();
        let seconds = settings.bathRoomDevice_report_interval;
        if (seconds >= 30) {
            this._bathroomDeviceTimeout = setTimeout(this.refreshBathroomDevice.bind(this), seconds * 1000);
        }
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
