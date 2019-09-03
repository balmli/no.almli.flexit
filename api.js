'use strict';

const Homey = require('homey');

function getStatus() {
    let status = undefined;
    Object.keys(Homey.ManagerDrivers.getDrivers()).forEach(driver => {
        Homey.ManagerDrivers.getDriver(driver).getDevices().forEach(device => {
            status = device.getStatus();
        })
    });
    return {
        "frames": [
            {
                "text": status !== undefined ? status.descr : '',
                "icon": status && status.running ? "21368": "20121",
                "index": 0
            }
        ]
    }
}

module.exports = [
    {
        description: 'Get fan status',
        method: 'GET',
        path: '/fanstatus',
        public: true,
        role: 'owner',
        fn: function (args, callback) {
            callback(null, getStatus())
        }
    }
];
