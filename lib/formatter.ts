const formatNgn = (value: number): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(value);
};
const formatDoller = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};
formatNgn(123456.789); // "₦123,456.79"
formatDoller(123456.789); // "$123,456.79"
export const formatter = {
  formatNgn,
  formatDoller,
};
