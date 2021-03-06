import "../TestHelper";
import {expect} from 'chai';
import {ConverterService} from "../../src/converter/ConverterService";
import {Property} from "../../src/converter/decorator/Property";
import {IConverter} from "../../src/converter/interface/IConverter";
import {Service} from "../../src/mvc/decorator/Service";
import {PropertyInherited} from "../../src/converter/decorator/PropertyInherited";


describe('ConverterService', () => {

    const converter = new ConverterService();

    @Service()
    class ATestClassImplementIConverter implements IConverter {


        public serialize(data: ATestConverterClassTarget, klassProperty: string, objectProperty: string): any {
            return data.updatedAt.toISOString();
        }

        public deserialize(data: any, klassProperty: string, objectProperty: string): any {
            return data.name;
        }
    }

    class ATestConverterBaseClass {

        @Property()
        public id: number;

    }

    @PropertyInherited(ATestConverterBaseClass)
    class ATestConverterClassTarget extends ATestConverterBaseClass {

        @Property()
        public name: string;

        @Property("created_at")
        public createdAt: String;

        @Property("updated_at")
        public updatedAt: Date;

        @Property({converter: ATestClassImplementIConverter})
        public converter: string;
    }

    class AnotherTestConverterClassTarget {

        @Property('created_at')
        public createdAt: Date;

        @Property('updated_at')
        public updatedAt: String;

    }

    class ANestTestConverterClass {

        @Property({baseType: AnotherTestConverterClassTarget})
        public arr: AnotherTestConverterClassTarget[];

    }

    const d1 = new Date();
    const d2 = new Date();

    const objExample = {
        id: 1,
        name: "aName",
        created_at: d1.toISOString(),
        updated_at: d2.toISOString()
    };

    const objWithPrefix = {
        obj_id: 1,
        obj_name: "aName",
        obj_created_at: d1.toISOString(),
        obj_updated_at: d2.toISOString()
    };

    const insExample = new ATestConverterClassTarget();
    insExample.id = 2;
    insExample.name = "FFF";
    insExample.createdAt = d1.toISOString();
    insExample.updatedAt = d2;



    it('should convert data to String', () => {
        assertConverterResult(String, 'aaa');
        assertConverterResult(String, 111, '111');
    });

    it('should convert data to Number', () => {
        assertConverterResult(Number, 111);
    });

    it('should convert data to Boolean', () => {
        assertConverterResult(Boolean, 'true', true);
        assertConverterResult(Boolean, 'false', false);
        assertConverterResult(Boolean, true);
        assertConverterResult(Boolean, false);
        assertConverterResult(Boolean, 1, true);
        assertConverterResult(Boolean, 0, false);
    });

    it('should convert data to Date', () => {

        const now = new Date();
        const nowString = now.toISOString();
        const nowNumber = now.getTime();

        assertConverterResult(Date, now);
        assertConverterResult(Date, nowString, now);
        assertConverterResult(Date, nowNumber, now);
    });

    it('should convert an object to a class instance', () => {
        const ins = converter.convert(objExample, ATestConverterClassTarget);
        assertInstance(ins);
    });

    it('should convert an instance to an object', () => {
        const obj = converter.convert(insExample, Object);
        assertObject(obj);
    });

    it('should convert an array of objects to an array of class instance', () => {
        const objArr = [objExample, objExample, objExample];
        const insArr = converter.convert(objArr, Array, {baseType: ATestConverterClassTarget});

        expect(insArr instanceof Array).to.be.true;
        expect(insArr.length).to.be.equal(3);

        insArr.forEach(assertInstance);
    });

    it('should convert an array of class instance to an array of objects', () => {
        const insArr = [insExample, insExample, insExample];
        const objArr = converter.convert(insArr, Array, {baseType: Object});

        expect(objArr instanceof Array).to.be.true;
        expect(objArr.length).to.be.equal(3);

        objArr.forEach(assertObject);
    });

    it('should convert a map with object as value to a map with class instance as value', () => {
        const map = new Map();
        map.set('key', objExample);

        const convertedMap = converter.convert(map, Map, {baseType: ATestConverterClassTarget});

        expect(convertedMap instanceof Map).to.be.true;

        const ins = convertedMap.get('key');
        assertInstance(ins);
    });

    it('should convert a map with class instance as value to a map with object as value', () => {
        const map = new Map();
        map.set('key', insExample);

        const convertedMap = converter.convert(map, Map, {baseType: Object});

        expect(convertedMap instanceof Map).to.be.true;

        const obj = convertedMap.get('key');
        assertObject(obj);
    });

    it('should convert an object to an class instance with converter deserialize', () => {

        const ins = converter.convert(objExample, ATestConverterClassTarget);

        assertInstance(ins);
        expect(ins.converter).to.be.equal(objExample.name);
    });

    it('should convert a class instance to an object with converter serialize', () => {

        const obj = converter.convert(insExample, Object);
        assertObject(obj);
        expect(obj.converter).to.be.equal(insExample.updatedAt.toISOString());
    });

    it('should convert a class instance to another class instance', () => {

        const anotherIns: AnotherTestConverterClassTarget = converter.convert(insExample, AnotherTestConverterClassTarget);
        expect(anotherIns.createdAt.toISOString()).to.be.equal(insExample.createdAt);
        expect(anotherIns.updatedAt).to.be.equal(insExample.updatedAt.toString());

    });

    it('should convert an object with prefix to a class instance', () => {

        const ins: ATestConverterClassTarget = converter.convert(objWithPrefix, ATestConverterClassTarget, {prefix: "obj_"});
        assertInstance(ins);
    });

    it('should convert a class instance to a object with prefix', () => {

        const obj = converter.convert(insExample, Object, {prefix: "obj_"});
        expect(obj.obj_id).to.be.equal(2);
        expect(obj.obj_name).to.be.equal('FFF');
        expect(obj.obj_created_at).to.be.equal(d1.toISOString());
        expect(obj.obj_updated_at.getTime()).to.be.equal(d2.getTime());
    });


    it('should convert a class with array of property', () => {

        const date = new Date();

        const testNestObj1 = {
            arr: [
                {
                    created_at: date,
                    updated_at: "123"
                },
                {
                    created_at: date,
                    updated_at: "456"
                }
            ]
        };

        const result1: ANestTestConverterClass = converter.convert(testNestObj1, ANestTestConverterClass);

        result1.arr.forEach((item, i) => {
            expect(item instanceof AnotherTestConverterClassTarget).to.be.true;
            expect(item.createdAt).to.be.equal(date);

            if (i === 0) {
                expect(item.updatedAt).to.be.equal("123");
            } else {
                expect(item.updatedAt).to.be.equal("456");
            }
        });

        const testNestObj2 = {
            arr: []
        };

        const result2: ANestTestConverterClass = converter.convert(testNestObj2, ANestTestConverterClass);

        expect(Array.isArray(result2.arr)).to.be.true;
    });


    function assertConverterResult(type: Function, data: any, target?: any) {

        if (typeof target === 'undefined') {
            target = data;
        }

        if (type === Date) {
            expect(converter.convert(data, type).getTime()).to.be.equal(target.getTime());
        } else {
            expect(converter.convert(data, type)).to.be.equal(target);
        }
    }

    function assertInstance(ins) {
        expect(ins).not.to.be.undefined;
        expect(ins.id).to.be.equal(1);
        expect(ins.name).to.be.equal('aName');
        expect(ins.createdAt).to.be.equal(d1.toISOString());
        expect(ins.updatedAt.getTime()).to.be.equal(d2.getTime());
    }

    function assertObject(obj) {

        expect(obj.id).to.be.equal(2);
        expect(obj.name).to.be.equal('FFF');
        expect(obj.created_at).to.be.equal(d1.toISOString());
        expect(obj.updated_at.getTime()).to.be.equal(d2.getTime());
    }
});