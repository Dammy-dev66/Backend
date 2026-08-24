const test = require("node:test");
const assert = require("node:assert/strict");

const { applyCoupon, couponAppliesToPackage, applyDiscount } = require("../lib/coupons");

test("coupon package targeting only applies to selected package keys", () => {
  const coupon = {
    code: "FIN15",
    percent: 15,
    packageKeys: ["oneToOne:pack6", "oneToTwo:pack12"],
    active: true
  };

  assert.equal(couponAppliesToPackage(coupon, "oneToOne", "pack6"), true);
  assert.equal(couponAppliesToPackage(coupon, "oneToTwo", "pack6"), false);
  assert.equal(couponAppliesToPackage(coupon, "oneToTwo", "pack12"), true);
});

test("applyCoupon and legacy applyDiscount both resolve percentage discounts", () => {
  const coupon = { percent: 20, active: true };

  assert.deepEqual(applyCoupon(250, coupon), {
    discountAmount: 50,
    totalPrice: 200
  });

  assert.deepEqual(applyDiscount(250, { type: "percent", value: 20 }), {
    discountAmount: 50,
    totalPrice: 200
  });
});
