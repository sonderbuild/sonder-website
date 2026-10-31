export function checkoutReturnPath(value:unknown):string|undefined {
 return value==='/account/checkout/mactric-major-1'||value==='/account/checkout/return'||value==='/account/checkout/cancelled'?value:undefined;
}
