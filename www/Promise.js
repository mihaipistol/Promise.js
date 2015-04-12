/*jslint browser: true, continue: true, newcap: true, plusplus: true, todo: true, white: true */

/**
 * Promise v0.2.2
 * @author Mihai Pistol
 */
(function () {
    "use strict";
    var PENDING, RESOLVED, REJECTED;
    /**
     * @constant
     * @type String
     */
    PENDING = "PENDING";
    /**
     * @constant
     * @type String
     */
    RESOLVED = "RESOLVED";
    /**
     * @constant
     * @type String
     */
    REJECTED = "REJECTED";

    /**
     * The Promise represents a proxy for a value not necessarily known at its creation time. It allows you to associate
     * handlers to an asynchronous action's eventual success or failure. This lets asynchronous methods return values
     * like synchronous methods: instead of the final value, the asynchronous method returns a promise of having a value
     * at some point in the future. A promise can become either fulfilled with a value, or rejected with a reason. When
     * either of these happens, the associated handlers queued up by a promise's then method are called.
     * @constructor
     * @param {Function} func
     * @returns {Promise}
     */
    function Promise (func) {
        var fate, queue, status;
        if (typeof func !== "function") {
            throw new TypeError("Promise constructor takes a function argument");
        }
        fate = undefined;
        queue = [];
        status = PENDING;
        /**
         * It schedules the processing of the resolution for the given operation, and its associated promise linker,
         * with their fates.
         * @memberOf {Promise}
         * @private
         * @function
         * @param {Object}    args
         * @param {Function} [args.resolve]
         * @param {Function} [args.reject]
         * @param {Object}    args.link
         * @param {Function}  args.link.resolve
         * @param {Function}  args.link.reject
         * @param {Promise}   args.link.promise
         * @param {String}    operation
         * @returns {undefined}
         */
        function envoy (args, operation) {
            if (fate instanceof Promise) {
                fate.chain(args);
            } else if (typeof args[operation] === "function") {
                window.setImmediate(function () {
                    try {
                        args.link.resolve(args[operation](fate));
                    } catch (ex) {
                        args.link.reject(ex);
                    }
                });
            } else {
                window.setImmediate(args.link[operation], fate);
            }
        }
        /**
         * Helper function for .resolve and .reject. It iterates the queue and calls .envoy with the necessary
         * parameters.
         * @memberOf {Promise}
         * @private
         * @function
         * @param {String} operation
         * @returns {undefined}
         */
        function enlighten (operation) {
            var i, maxI;
            for (i = 0, maxI = queue.length; i < maxI; i++) {
                envoy(queue[i], operation);
            }
        }
        /**
         * Resolver the promise with the given value.
         * @memberOf {Promise}
         * @private
         * @function
         * @param {type} value
         * @returns {undefined}
         */
        function resolver (value) {
            if (status === PENDING) {
                fate = value;
                status = RESOLVED;
                enlighten("resolve");
            }
        }
        /**
         * Rejects the promise with the given reason.
         * @memberOf {Promise}
         * @private
         * @function
         * @param {type} reason
         * @returns {undefined}
         */
        function rejector (reason) {
            if (status === PENDING) {
                fate = reason;
                status = REJECTED;
                enlighten("reject");
            }
        }
        /**
         * Ads the given promise, to the promises chain.
         * @memberOf {Promise}
         * @private
         * @function
         * @param {Object}    args
         * @param {Function} [args.resolve]
         * @param {Function} [args.reject]
         * @param {Object}    args.link
         * @param {Function}  args.link.resolve
         * @param {Function}  args.link.reject
         * @param {Promise}   args.link.promise
         * @returns {undefined}
         */
        this.chain = function (args) {
            if (!(args instanceof Object)) {
                throw new TypeError("The given argument is null");
            }
            if (!(args.resolve === null || typeof args.resolve === "function")) {
                throw new TypeError("The given resolve argument is invalid, null or function");
            }
            if (!(args.reject === null || typeof args.reject === "function")) {
                throw new TypeError("The given reject argument is invalid, null or function");
            }
            if (!(typeof args.link.resolve === "function")) {
                throw new TypeError("The given resolve link argument is invalid, null or function");
            }
            if (!(typeof args.link.reject === "function")) {
                throw new TypeError("The given reject link argument is invalid, null or function");
            }
            if (!(args.link.promise instanceof Promise)) {
                throw new TypeError("The given promise link argument, must be an instance of Promise");
            }
            switch (status) {
                case PENDING:
                    queue.push(args);
                    break;
                case RESOLVED:
                    envoy(args, "resolve");
                    break;
                case REJECTED:
                    envoy(args, "reject");
                    break;
            }
        };
        window.setImmediate(function () {
            try {
                func(resolver, rejector);
            } catch (ex) {
                rejector(ex);
            }
        });
    }
    /**
     * Returns a Promise object that is resolved with the given value. If the value is a thenable (i.e. has a then
     * method), the returned promise will "follow" that thenable, adopting its eventual state; otherwise the
     * returned promise will be resolved with the given value.
     * @memberOf {Promise}
     * @public
     * @static
     * @function
     * @param {type} value
     * @returns {Promise}
     */
    Promise.resolve = function (value) {
        return new Promise(function (onResolved, onRejected) {
            if (value && typeof value.then === "function") {
                value.then(onResolved, onRejected);
            } else {
                onResolved(value);
            }
        });
    };
    /**
     * Returns a Promise object that is rejected with the given reason.
     * @memberOf {Promise}
     * @public
     * @static
     * @function
     * @param {type} reason
     * @returns {Promise}
     */
    Promise.reject = function (reason) {
        return new Promise(function (onResolved, onRejected) {
            onRejected(reason);
        });
    };
    /**
     * Returns a promise that resolves when all of the promises in iterable have resolved. The result is passed an
     * array of values from all the promises. If something passed in the iterable array is not a promise, it's
     * converted to one by Promise.resolve. If any of the passed in promises rejects, the all Promise immediately
     * rejects with the value of the promise that rejected, discarding all the other promises whether or not they
     * have resolved.
     * @memberOf {Promise}
     * @public
     * @static
     * @function
     * @param {type} iterable
     * @returns {Promise}
     */
    Promise.all = function (iterable) {
        return new Promise(function (onResolved, onRejected) {
            var results, remaining, status;
            results = [];
            remaining = iterable.length;
            status = true;
            iterable.forEach(function (value, index) {
                var promise;
                if (value && typeof value.then !== "function") {
                    promise = value;
                } else {
                    promise = Promise.resolve(value);
                }
                promise.then(function (value) {
                    if (status) {
                        results[index] = value;
                        remaining -= 1;
                        if (remaining === 0) {
                            onResolved(results);
                        }
                    }
                }, function (reason) {
                    status = false;
                    onRejected(reason);
                });
            });
        });
    };
    /**
     * Returns a promise that either resolves when the first promise in the iterable resolves, or rejects when the
     * first promise in the iterable rejects.
     * @memberOf {Promise}
     * @public
     * @static
     * @function
     * @param {type} iterable
     * @returns {Promise}
     */
    Promise.race = function (iterable) {
        return new Promise(function (onResolved, onRejected) {
            var found = false;
            iterable.forEach(function (promise) {
                promise.then(function (value) {
                    if (!found) {
                        found = true;
                        onResolved(value);
                    }
                }, function (reason) {
                    if (!found) {
                        found = true;
                        onRejected(reason);
                    }
                });
            });
        });
    };
    /**
     * Appends fullfillment and rejection handlers to the promise, and returns a new promise resolving to the return
     * value of the called handler.
     * @memberOf {Promise}
     * @public
     * @function
     * @param {Function} [onResolved]
     * @param {Function} [onRejected]
     * @returns {undefined}
     */
    Promise.prototype.then = function (onResolved, onRejected) {
        var that, promise;
        that = this;
        promise = new Promise(function (resolve, reject) {
            that.chain({
                resolve: typeof onResolved === "function" ? onResolved : null,
                reject: typeof onRejected === "function" ? onRejected : null,
                link: {
                    resolve: resolve,
                    reject: reject,
                    promise: promise
                }
            });
        });
        return promise;
    };
    /**
     * Appends a rejection handler callback to the promise, and returns a new promise resolving to the return value
     * of the callback if it is called, or to its original fulfillment value if the promise is instead fulfilled.
     * @memberOf {Promise}
     * @public
     * @function
     * @param {Function} [onRejected]
     * @returns {undefined}
     */
    Promise.prototype.catch = function (onRejected) {
        var that, promise;
        that = this;
        promise = new Promise(function (resolve, reject) {
            that.chain({
                resolve: null,
                reject: typeof onRejected === "function" ? onRejected : null,
                link: {
                    resolve: resolve,
                    reject: reject,
                    promise: promise
                }
            });
        });
        return promise;
    };
    /**
     * If the system does not have setImmediate, then we simulate it with setTimeout.
     */
    if (!window.setImmediate) {
        /**
         * This method is used to break up long running operations and run a callback function immediately after the
         * browser has completed other operations such as events and display updates.
         * @public
         * @function
         * @param {Function} func
         * @param {...type} param
         * @returns {Number} immediateID
         */
        window.setImmediate = function () {
            var args = Array.prototype.slice.call(arguments);
            args.splice(1, 0, 0);
            return window.setTimeout.apply(window, args);
        };
        /**
         * This method clears the action specified by window.setImmediate.
         * @public
         * @function
         * @param {Number} immediateID
         * @returns {undefined}
         */
        window.clearImmediate = function (immediateID) {
            window.clearTimeout(immediateID);
        };
    }
    /*
     * If your system does not have a Promise implementation, then we push the fallback.
     */
    if (!window.Promise) {
        window.Promise = Promise;
    }
    /*
     * If AMD is present, we must comply with its requirements.
     */
    if (typeof window.define === "function" && window.define.amd) {
        window.define("Promise", [], function () {
            return window.Promise;
        });
    }
}());
