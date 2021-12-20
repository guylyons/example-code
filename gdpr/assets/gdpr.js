(function ($) {
  'use strict';

  Drupal.behaviors.unegdpr = {
    attach: function (context, settings) {
      var gdprButton = $('.gdpr-button', context);
      var gdprContainer = $('.gdpr', context);

      if (!gdprButton.length) return;

      if (gdprButton && gdprContainer) {
        // event listener to set cookie
        // and close out the popup
        gdprButton.click(function (event) {
          event.preventDefault();

          gdprContainer.hide();

          var d = new Date();

          // expire in 90 days
          d.setTime(d.getTime() + 90 * 24 * 60 * 60 * 1000);
          var expiry = 'expires=' + d.toUTCString();

          // set cookie
          document.cookie = 'une_gdpr=1;path=/;' + expiry;
        });

        var cookies = document.cookie.split('; ');

        // https://tc39.github.io/ecma262/#sec-array.prototype.includes
        if (!Array.prototype.includes) {
          Object.defineProperty(Array.prototype, 'includes', {
            value: function (valueToFind, fromIndex) {
              if (this == null) {
                throw new TypeError('"this" is null or not defined');
              }

              // 1. Let O be ? ToObject(this value).
              var o = Object(this);

              // 2. Let len be ? ToLength(? Get(O, "length")).
              var len = o.length >>> 0;

              // 3. If len is 0, return false.
              if (len === 0) {
                return false;
              }

              // 4. Let n be ? ToInteger(fromIndex).
              //    (If fromIndex is undefined, this step produces the value 0.)
              var n = fromIndex | 0;

              // 5. If n ≥ 0, then
              //  a. Let k be n.
              // 6. Else n < 0,
              //  a. Let k be len + n.
              //  b. If k < 0, let k be 0.
              var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

              function sameValueZero(x, y) {
                return (
                  x === y ||
                  (typeof x === 'number' &&
                    typeof y === 'number' &&
                    isNaN(x) &&
                    isNaN(y))
                );
              }

              // 7. Repeat, while k < len
              while (k < len) {
                // a. Let elementK be the result of ? Get(O, ! ToString(k)).
                // b. If SameValueZero(valueToFind, elementK) is true, return true.
                if (sameValueZero(o[k], valueToFind)) {
                  return true;
                }
                // c. Increase k by 1.
                k++;
              }

              // 8. Return false
              return false;
            },
          });
        }

        // show the popup if the user has not
        // accepted the policy
        if (!cookies.includes('une_gdpr=1')) {
          gdprContainer.show();
        }
      }
    },
  };
})(jQuery);
