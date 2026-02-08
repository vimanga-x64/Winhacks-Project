/// <reference types="vite/client" />
/// <reference path="./global.d.ts" />

declare module '*.glb' {
	const src: string;
	export default src;
}
