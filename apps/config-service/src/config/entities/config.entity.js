"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
// src/config/entities/config.entity.ts
var typeorm_1 = require("typeorm");
var Config = function () {
    var _classDecorators = [(0, typeorm_1.Entity)('configs'), (0, typeorm_1.Unique)(['service', 'key'])];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _service_decorators;
    var _service_initializers = [];
    var _service_extraInitializers = [];
    var _key_decorators;
    var _key_initializers = [];
    var _key_extraInitializers = [];
    var _value_decorators;
    var _value_initializers = [];
    var _value_extraInitializers = [];
    var _key_description_decorators;
    var _key_description_initializers = [];
    var _key_description_extraInitializers = [];
    var _value_description_decorators;
    var _value_description_initializers = [];
    var _value_description_extraInitializers = [];
    var _isActive_decorators;
    var _isActive_initializers = [];
    var _isActive_extraInitializers = [];
    var _updatedAt_decorators;
    var _updatedAt_initializers = [];
    var _updatedAt_extraInitializers = [];
    var Config = _classThis = /** @class */ (function () {
        function Config_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.service = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _service_initializers, void 0)); // 'auction', 'forum', etc.
            this.key = (__runInitializers(this, _service_extraInitializers), __runInitializers(this, _key_initializers, void 0));
            this.value = (__runInitializers(this, _key_extraInitializers), __runInitializers(this, _value_initializers, void 0)); // число, строка, объект, массив
            this.key_description = (__runInitializers(this, _value_extraInitializers), __runInitializers(this, _key_description_initializers, void 0));
            this.value_description = (__runInitializers(this, _key_description_extraInitializers), __runInitializers(this, _value_description_initializers, void 0));
            this.isActive = (__runInitializers(this, _value_description_extraInitializers), __runInitializers(this, _isActive_initializers, void 0)); // мягкое удаление
            this.updatedAt = (__runInitializers(this, _isActive_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            __runInitializers(this, _updatedAt_extraInitializers);
        }
        return Config_1;
    }());
    __setFunctionName(_classThis, "Config");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)('uuid')];
        _service_decorators = [(0, typeorm_1.Column)()];
        _key_decorators = [(0, typeorm_1.Column)()];
        _value_decorators = [(0, typeorm_1.Column)({ type: 'jsonb' })];
        _key_description_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _value_description_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _isActive_decorators = [(0, typeorm_1.Column)({ default: true })];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _service_decorators, { kind: "field", name: "service", static: false, private: false, access: { has: function (obj) { return "service" in obj; }, get: function (obj) { return obj.service; }, set: function (obj, value) { obj.service = value; } }, metadata: _metadata }, _service_initializers, _service_extraInitializers);
        __esDecorate(null, null, _key_decorators, { kind: "field", name: "key", static: false, private: false, access: { has: function (obj) { return "key" in obj; }, get: function (obj) { return obj.key; }, set: function (obj, value) { obj.key = value; } }, metadata: _metadata }, _key_initializers, _key_extraInitializers);
        __esDecorate(null, null, _value_decorators, { kind: "field", name: "value", static: false, private: false, access: { has: function (obj) { return "value" in obj; }, get: function (obj) { return obj.value; }, set: function (obj, value) { obj.value = value; } }, metadata: _metadata }, _value_initializers, _value_extraInitializers);
        __esDecorate(null, null, _key_description_decorators, { kind: "field", name: "key_description", static: false, private: false, access: { has: function (obj) { return "key_description" in obj; }, get: function (obj) { return obj.key_description; }, set: function (obj, value) { obj.key_description = value; } }, metadata: _metadata }, _key_description_initializers, _key_description_extraInitializers);
        __esDecorate(null, null, _value_description_decorators, { kind: "field", name: "value_description", static: false, private: false, access: { has: function (obj) { return "value_description" in obj; }, get: function (obj) { return obj.value_description; }, set: function (obj, value) { obj.value_description = value; } }, metadata: _metadata }, _value_description_initializers, _value_description_extraInitializers);
        __esDecorate(null, null, _isActive_decorators, { kind: "field", name: "isActive", static: false, private: false, access: { has: function (obj) { return "isActive" in obj; }, get: function (obj) { return obj.isActive; }, set: function (obj, value) { obj.isActive = value; } }, metadata: _metadata }, _isActive_initializers, _isActive_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: function (obj) { return "updatedAt" in obj; }, get: function (obj) { return obj.updatedAt; }, set: function (obj, value) { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Config = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Config = _classThis;
}();
exports.Config = Config;
