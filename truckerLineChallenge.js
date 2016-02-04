module.exports.translateStringToObject = translateStringToObject;
module.exports.translateObjectToString = translateObjectToString;

/**
 * Utlities Module:
 * Assume that any required translations will be available here and will return
 * the expected value.
 */

var utils = (function () {

    return {
        toShortState: toShortState,
        toLongState: toLongState
    };
    
    // Assume that all States will be properly translated
    function toShortState(state) {
        switch (state.toLowerCase()) {
            case 'california': return 'CA';
            default: return state;
        }
    }

    function toLongState(state) {
        switch (state.toUpperCase()) {
            case 'CA': return 'California';
            default: return state;
        }
    }

})();

/**** Sample Configuration and Objects ************************************* */

var configuration = [
    { propKey: 'Prop0', objectType: 'User', objectKey: 'name' },
    { propKey: 'Prop1', objectType: 'User', objectKey: 'address.streetAddresses[0]' },
    { propKey: 'Prop2', objectType: 'User', objectKey: 'address.streetAddresses[1]' },

    { propKey: 'Prop3', objectType: 'User', objectKey: 'address.city' },
    // updated toObject values to not be string representations of the functions.
    // This way I can treat type coercion and custom utility functions the same (without using eval)
    { propKey: 'Prop4', objectType: 'User', objectKey: 'address.state', toObject: utils.toShortState, toProp: utils.toLongState },
    { propKey: 'Prop5', objectType: 'User', objectKey: 'address.zipCode' },
    { propKey: 'Prop32', objectType: 'User', objectKey: 'yearsExperience', toObject: Number }
];

var sampleUser = {
    name: 'Patrick Fowler',
    address: {
        streetAddresses: ['123 Fake St.', ''],
        city: 'Fakeville',
        state: 'CA',
        zipCode: '45678'
    },
    yearsExperience: 7
};

var sampleUserString = 'Prop0:Patrick Fowler,Prop1:123 Fake St,Prop3:Fakeville,Prop4:California,Prop5:45678,Prop32:7,Prop2:NewAddress,Prop19:dsnsd';

/**** Implementation START ************************************************* */

/**
 * translateStringToObject
 * @param {String} inputString An arbitrary string to be translated
 * @returns {Object} A object representation of the input object
 */

function translateStringToObject(inputString) {
    var resultObject = {},
        inputArray   = inputString.split(',');

    for (var i = 0; i < inputArray.length; i++) {
        var keyValueArray,
            keyValueString = inputArray[i];

        if (keyValueString !== undefined) {
            keyValueArray = keyValueString.split(':');
        }
        
        iu = mapPropKeyToObjectKey(configuration, keyValueArray[0], keyValueArray[1]);
        resultObject = nest(resultObject, iu[0].split('.'), iu[1]);
    }

    return resultObject;
}

/**
 * translateObjectToString
 * @param {Object} inputObject An arbitrary object to be translated
 * @returns {String} A string representation of the input object
 */

function translateObjectToString(inputObject) {
    var resultArray = [];
    result = flatten(inputObject);

    for (var i in result) {
        vals = mapObjectKeyToPropKey(configuration, i, result[i]);
        key = vals[0];
        value = vals[1];
        result[key] = value;
        delete result[i];
    }

    return objectToString(result);
}

/**
 * objectToString
 * @param {Object} A flat object to be converted into a string
 * @returns {String} A string representation of the input object
 */

function objectToString(object) {
    var string = '';

    for (var i in object) {
        if (object.hasOwnProperty(i)) {
            string += i + ':' + object[i] + ',';
        }
    }

    return string.slice(0, -1);
}

/*
 * nest
 * An iterative function to convert a flattened object (where keys are defined as
 * strings that use dot notation) into a nested object
 * EX: {'one.two.three', '1'} => {one: {two: {three: '1'}}}
 *
 * @params {Object} object A flat object to be converted into a string
 *         {Array} keys An array of keys where index represents level of nesting
 *         {Object} value The value of said key
 * @returns {Object} A nested representation of the flattened object 
 */

function nest(object, keys, value) {
    var index,
        object = object || {};

    // determine if key has `[0]` notation to signify it's corresponding
    // value is an array
    if (keys[0].match(/.*\[|\]/gi)) {
        index = keys[0].replace(/.*\[|\]/gi,'');
        keys[0] = keys[0].replace(/\[(.*)\]/, '');
    }

    if (keys.length === 1) {
        if (index !== undefined && object[keys[0]] !== undefined) {
            object[keys[0]] = object[keys[0]].split();
            object[keys[0]][index] = value;
        } else {
            object[keys[0]] = value;
        }
    } else {
        var key = keys.shift();
            updatedObject = (object[key] === undefined ? {} : object[key]);

        object[key] = nest(updatedObject, keys, value);
    }

    return object;
}

/*
 * flatten
 * Iterative function to convert a nested object to a flattened representation,
 * where the key is in dot notation.
 * http://stackoverflow.com/questions/13218745/convert-complex-javascript-object-to-dot-notation-object
 * EX: {one: {two: {three: '1'}}} => {'one.two.three', '1'}
 *
 * @params {Object} object An object to be flattened
 *         {Object} current The current sub-object
 *         {Object} result The result object that is recursively being built
 * @returns {String} A string representation of the input object
 */

function flatten(object, current, result) {
    var result = result || {},
        object = object || {};

    for (var i in object) {
        var newKey,
            value = object[i];

        if (current) {
            newKey = (i.match(/^\d+$/)) ? (current + '[' + i + ']') : (current + '.' + i)
        } else {
            newKey = i
        }

        if (value && typeof value === 'object') {
            if (i.match(/^\d+$/)) value = value.shift();
            flatten(value, newKey, result);
        } else {
            result[newKey] = value;
        }
    }

    return result;
}

/*
 * mapPropKeyToObjectKey
 * @param {Array of Objects} config An array of objects that represent the
 *        translation configuration
 *        {String} key The key to be mapped
 *        {String} value The value to be mapped, which may updated based on
 *        toObject configuration
 * @returns {String} A string representation of the input object
 */

function mapPropKeyToObjectKey(config, key, value) {
    for (var i in config) {
        var configValue = config[i];

        if (key == configValue.propKey) {
            key = configValue.objectKey;

            if (configValue.toObject !== undefined &&
                typeof configValue.toObject === "function") {

                value = configValue.toObject(value);
            }
        }
    }

    return [key, value];
}

/*
 * mapObjectKeyToPropKey
 * @param {Array of Objects} config An array of objects that represent the
 *        transplation configuration
 *        {String} key The key to be mapped
 *        {String} value The value to be mapped, which may be updated based on 
 *                 toProp configuration
 * @returns {String} A string representation of the input object
 */

function mapObjectKeyToPropKey(config, key, value) {
    for (var i in config) {
        var configValue = config[i];

        if (key == configValue.objectKey) {
            key = configValue.propKey;

            if (configValue.toProp !== undefined &&
                typeof configValue.toProp === "function") {

                value = configValue.toProp(value);
            }
        }
    }

    return [key, value];
}

/**** Implementation END ************************************************* */

// Test it out
console.log("*** translateStringToObject ***");
console.log("Input:");
console.log(sampleUserString);
console.log("Output:");
console.log(translateStringToObject(sampleUserString));

console.log("\n\n\n");
console.log("*** translateObjectToString ***");
console.log("Input:");
console.log(sampleUser);
console.log("Output:");
console.log(translateObjectToString(sampleUser));
