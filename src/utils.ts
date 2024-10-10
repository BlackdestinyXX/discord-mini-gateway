export let p = (func: any) => {
	return (data: any) => {
		func(JSON.parse(data));
	}
}
export let e = JSON.stringify;
export let encoding = 'json';
try {
	const erlpack = require('erlpack')
	p = (func) => {
		return (data) => {
			func(erlpack.unpack(data));
		}
	}
	e = erlpack.pack;
	encoding = 'etf';
} catch (e) {
}