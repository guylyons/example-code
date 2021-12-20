(function($, Drupal) {
  Drupal.behaviors.une_alerts = {
    attach: function(context, settings) {
      $("body", context)
        .once("alertBehavior")
        .each(function() {
          // Declare the new UNE Emergency object reference
          var unee = new UNEEmergency();
        });
    }
  };

  // Polyfill for Array.prototype.filter()
  if (!Array.prototype.filter) {
    Array.prototype.filter = function(func, thisArg) {
      "use strict";
      if (!((typeof func === "Function" || typeof func === "function") && this))
        throw new TypeError();

      var len = this.length >>> 0,
        res = new Array(len), // preallocate array
        t = this,
        c = 0,
        i = -1;
      if (thisArg === undefined) {
        while (++i !== len) {
          // checks to see if the key was set
          if (i in this) {
            if (func(t[i], i, t)) {
              res[c++] = t[i];
            }
          }
        }
      } else {
        while (++i !== len) {
          // checks to see if the key was set
          if (i in this) {
            if (func.call(thisArg, t[i], i, t)) {
              res[c++] = t[i];
            }
          }
        }
      }

      res.length = c; // shrink down array to proper size
      return res;
    };
  }

  // UNE Emergency Object
  function UNEEmergency() {
    // Declare global UNEEmergency() vars
    var refreshDuration = 30000,
      cookieExpireDays = 1;
    var timeoutIteration;
    var regEmergencyPage = new RegExp(/^\/emergency(\/?)$/);
    var regAdminPage = new RegExp(/^\/admin(\/?)/);
    var dt = new Date();

    // fetch() function - local only, gets the json feed and sends it for processing
    var fetch = function() {
      // clear the iteration timer, just in case
      clearTimeout(timeoutIteration);

      // call the json feed
      $.ajax({
        url: "/emergency/feed/feed.json",
        dataType: "json",
        cache: true,
        success: processAll, // calls the processAll function on fetch success
        error: fail // calls the fail function on fetch failure
      });
    }; // end fetch()

    // processTier() function: determine presence of new events and absence of old events
    var processTier = function(tierObject, cookieTimestamps) {
      var delta = { newItems: false, removedItems: false };

      if (typeof tierObject !== "undefined") {
        // tier exists
        if (tierObject.items.length > 0) {
          // tier is nonempty
          var feedTimestamps = [];

          for (let ii = 0; ii < tierObject.items.length; ii++) {
            feedTimestamps.push(tierObject.items[ii].timestamp);
          }

          // separate out timestamps in each set
          var timestampsUniqueToFeed = new Set(
            feedTimestamps.filter(a => !cookieTimestamps.has(a))
          );
          feedTimestamps = new Set(feedTimestamps);
          var timestampsUniqueToCookies = new Set(
            Array.from(cookieTimestamps).filter(a => !feedTimestamps.has(a))
          );

          cookieTimestamps = Array.from(cookieTimestamps);

          delta.newItems = timestampsUniqueToFeed.size > 0;
          delta.removedItems = timestampsUniqueToCookies.size > 0;
        } else if (cookieTimestamps.size > 0) {
          // feed is empty, but cookies are nonempty
          delta.removedItems = true;
        }
      }

      return delta;
    };

    // process() function - local only, processes the json feed retrieved from fetch()
    var processAll = function(jo) {
      var storedEvents = getAllCookies();
      var tier1HasEvents = jo.tier1.items.length > 0;

      // isolate just timestamps to get at unique events
      var storedTier1Events = new Set();
      for (let key in storedEvents["tier1"]) {
        storedTier1Events.add(parseInt(key));
      }
      var storedTier2Events = new Set();
      for (let key in storedEvents["tier2"]) {
        storedTier2Events.add(parseInt(key));
      }

      // get up-down on whether there are new / removed events for both tiers
      var tier1Changes = processTier(jo.tier1, storedTier1Events);
      var tier2Changes = processTier(jo.tier2, storedTier2Events);

      // remove items no longer in feed from cookies
      if (tier1Changes.removedItems) {
        for (let key in storedEvents["tier1"]) {
          // "key" here is the timestamp, value is cookie name
          removeCookie(storedEvents["tier1"][key]);
        }
        // reset storedEvents["tier1"]
        storedEvents["tier1"] = {};
      }
      if (tier2Changes.removedItems) {
        for (let key in storedEvents["tier2"]) {
          // "key" here is the timestamp, value is cookie name
          removeCookie(storedEvents["tier2"][key]);
        }
        // reset storedEvents["tier2"]
        storedEvents["tier2"] = {};
      }

      // set tier-1 / tier-2 cookies
      for (let ii = 0; ii < jo.tier1.items.length; ii++) {
        setCookie(
          "UNEEMERGENCY1." + ii.toString(),
          jo.tier1.items[ii].timestamp
        );
      }
      for (let ii = 0; ii < jo.tier2.items.length; ii++) {
        setCookie(
          "UNEEMERGENCY2." + ii.toString(),
          jo.tier2.items[ii].timestamp
        );
      }

      // we are on /emergency
      if (regEmergencyPage.test(location.pathname)) {
        // items removed from either feed
        var $content = $(".region-content");
        var esDisplayContainer = $content.find("#esdisplay-container");

        // create #esdisplay-container if non-existent
        if (esDisplayContainer.length == 0) {
          $content.first().prepend(
            $("<div>")
              .text("<!-- -->")
              .attr("id", "esdisplay-container")
          );
          esDisplayContainer = $content.find("#esdisplay-container");
        }

        // empty out if any items are removed; new items will be added shortly
        if (tier1Changes.removedItems || tier2Changes.removedItems) {
          esDisplayContainer.empty();
        }

        var currentAlert = "current-alert";
        if (jo.tier1.items.length > 0) {
          // we have a tier-1 emergency
          // Generate the tier1 display
          esDisplayContainer.addClass(currentAlert);
          esDisplayContainer.html(generateItemsHtml(jo.tier1.items, "1"));
        } else if (jo.tier2.items.length > 0) {
          // having no tier-1 emergency, we have a tier-2 emergency
          // Generate the tier2 display
          esDisplayContainer.addClass(currentAlert);
          esDisplayContainer.html(generateItemsHtml(jo.tier2.items, "2"));
        } else if (
          esDisplayContainer.length > 0 &&
          esDisplayContainer.hasClass(currentAlert)
        ) {
          // having no emergencies, display the all-clear text
          esDisplayContainer.removeClass(currentAlert);
          esDisplayContainer.html(generateAllClearHtml()); // add the all-clear text here
        }

        timeoutIteration = setTimeout(function() {
          fetch();
        }, refreshDuration);
      } else if (!regAdminPage.test(location.pathname)) {
        // we are not on /emergency or /admin
        // only redirect if there is a new tier-1 event
        if (tier1Changes.newItems) {
          window.location = "/emergency";
        } else {
          var $emergencyHeaderContainer = $("#emergency-header-container");

          // items removed from either feed, remove the banner
          if (tier1Changes.removedItems || tier2Changes.removedItems) {
            $emergencyHeaderContainer.remove();
            $emergencyHeaderContainer = $("#emergency-header-container");
          }

          // create red emergency banner on top left of page
          if (
            $emergencyHeaderContainer.length == 0 &&
            (jo.tier1.items.length > 0 || jo.tier2.items.length > 0)
          ) {
            $(".utility").prepend(
              $("<div/>")
                .addClass("alert-wrapper revealed")
                .append(
                  $("<a/>")
                    .addClass("revealer")
                    .attr("href", "#")
                    .click(function(ev) {
                      ev.preventDefault();
                      $(this)
                        .parent()
                        .toggleClass("revealed");
                    })
                )
                .append(
                  $("<div/>")
                    .attr("id", "emergency-header-container")
                    .click(function() {
                      window.location = "/emergency";
                    })
                )
            );
            $emergencyHeaderContainer = $("#emergency-header-container");
          }

          if (jo.tier1.items.length > 0) {
            // fill banner with tier-1 items
            $emergencyHeaderContainer.html(
              generateItemsBannerHtml(jo.tier1.items[0])
            );
            timeoutIteration = setTimeout(function() {
              fetch();
            }, refreshDuration);
          } else if (jo.tier2.items.length > 0) {
            // fill banner with tier-2 items
            $emergencyHeaderContainer.html(
              generateItemsBannerHtml(jo.tier2.items[0])
            );
            timeoutIteration = setTimeout(function() {
              fetch();
            }, refreshDuration);
          } else if ($emergencyHeaderContainer.length > 0) {
            $emergencyHeaderContainer.remove();
          }
        }
      }

      // no tier1 or tier2 entries.
      if (jo.tier1.items.length <= 0 && jo.tier2.items.length <= 0) {
        // Set the display date if they're on the /emergency page
        if (regEmergencyPage.test(location.pathname)) {
          if ($("p.esdisplay-currdate").length == 0) {
            var $dateLine = $("<p/>")
              .addClass("esdisplay-currdate")
              .html(
                "Today is " +
                  getWeekText(dt.getDay()) +
                  ", " +
                  getMonthText(dt.getMonth()) +
                  " " +
                  dt.getDate() +
                  ", " +
                  dt.getFullYear()
              );
            $dateLine.insertAfter("#esdisplay-container h2");
          }
        }
      }
    }; // end processAll()

    var generateItemsBannerHtml = function(item) {
      // Generate the emergency title
      var emergencyTitle =
        item.title +
        ": <span class='emergency-date clearfix'>" +
        item.propperDate;
      ("</span>");

      // Create the div object to return
      var $emDiv = $("<div/>")
        .attr("id", "emergency-display")
        .append(
          $("<a/>")
            .attr("href", "/emergency")
            .html(emergencyTitle)
        );

      // Return the contents
      return $emDiv.html();
    };

    var generateItemsHtml = function(items, tier) {
      var $htmlContainer = $("<div/>");

      // Set the date string
      var cDateString =
        getWeekText(dt.getDay()) +
        ", " +
        getMonthText(dt.getMonth()) +
        " " +
        dt.getDate() +
        ", " +
        dt.getFullYear();

      // Append the h3 alert text
      $htmlContainer.append($("<h3/>").text("Alert!"));

      // Append the date string
      $htmlContainer.append(
        $("<div/>")
          .attr("id", "esdisplay-currdate")
          .text("Today is " + cDateString)
      );

      // Create the tierContainer element
      var $tierContainer = $("<div/>").attr("id", "es-t" + tier + "-events");

      for (let ii = 0; ii < items.length; ii++) {
        // Build the eventContainer
        var $eventContainer = $("<div/>").addClass("es-t" + tier + "-event");

        if (ii === 0) {
          $eventContainer.addClass("first-event");
        }

        // Show the left side, contains the date, time, and day of week if it is not the same day of the event (event spans multi-day)
        var $eventLeftContainer = $("<div/>").addClass(
          "es-t" + tier + "-event-left"
        );

        // Add the DOW if the date of the event is not today
        if (items[ii].propperDate !== cDateString) {
          $eventLeftContainer.append(
            $("<div/>")
              .addClass("event-dow emergency-date")
              .text("Posted: " + items[ii].dow)
          );
        }

        // Add the event date and time to the left container
        $eventLeftContainer
          .append(
            $("<div/>")
              .addClass("event-date emergency-date")
              .text(items[ii].propperDate)
          )
          .append(
            $("<div/>")
              .addClass("event-time emergency-date")
              .text(items[ii].propperTime + " " + items[ii].timezone)
          );

        // Show the right side of the event, which contains the event details (title, description)
        var $eventRightContainer = $("<div/>")
          .addClass("es-t" + tier + "-event-right")
          .append(
            $("<div/>")
              .addClass("event-title")
              .text(items[ii].title)
          )
          .append(
            $("<div/>")
              .addClass("event-description")
              .text(items[ii].description)
          );

        // Append the left/right containers to the event container
        $eventContainer
          .append($eventLeftContainer)
          .append($eventRightContainer);

        // Add the eventContainer to the tierContainer
        $tierContainer.append($eventContainer);
      }

      // Add the tierContainer to the HTML container
      $htmlContainer.append($tierContainer);

      // Return the htmlContainer text
      return $htmlContainer.html();
    };

    var generateAllClearHtml = function() {
      var $htmlContainer = $("<div/>");

      // Append the h3 alert text
      $htmlContainer.append($("<h2/>").text("Current Status"));

      // Append the "operating under normal conditions"
      $htmlContainer.append(
        $("<p/>").text(
          "There is no emergency at the University of New England. The campus is operating under normal conditions."
        )
      );

      //
      $htmlContainer.append(
        $("<p/>")
          .text(
            "In the event of an emergency, this site will be updated with information about the nature of the incident, how to remain safe and the point at which safety has been restored "
          )
          .append(
            $("<span/>")
              .text("after the event")
              .css({
                color: "rgb(39, 39, 39)",
                "font-family": "Lato, sans-serif",
                "font-size": "16px",
                "line-height": "25.600000381469727px",
                "background-color": "rgb(255, 255, 255)"
              })
          )
          .append(".")
      );

      // Return the htmlContainer text
      return $htmlContainer.html();
    };

    // fail() function - local only, called on fetch() failure
    var fail = function(e) {
      // console.log(e);
    }; // end fail()

    var getAllCookies = function() {
      var tierLists = { tier1: {}, tier2: {} };
      var keyValuePairs = document.cookie.split(";");

      // loop through each cookie key-value pair
      for (let ii = 0; ii < keyValuePairs.length; ii++) {
        var keyVal = keyValuePairs[ii].split("=");
        var cookieKey = keyVal[0].trim();

        // cookieKey is neither "UNEEMERGENCY1" nor "UNEEMERGENCY2", so uninteresting
        if (!cookieKey.startsWith("UNEEMERGENCY")) {
          continue;
        }

        var thisTier = cookieKey.startsWith("UNEEMERGENCY1")
          ? "tier1"
          : "tier2";
        // try and split up by ':' character
        var timestamp = keyVal[1].trim();

        // reject any non-integral timestamps
        try {
          // attempt to add a key-value pair to the object, if the key is an integer
          parseInt(timestamp);
        } catch (e) {
          continue;
        }

        tierLists[thisTier][timestamp] = cookieKey;
      }

      // at this point we should have two (possibly empty)
      // objects of cookie names / integers stored in var tierLists
      return tierLists;
    };

    // setCookie() function - local only, called to set the current cookie status
    var setCookie = function(cKey, cVal) {
      var exdate = new Date();
      exdate.setDate(exdate.getDate() + cookieExpireDays);
      cVal =
        escape(cVal) +
        (cookieExpireDays == null
          ? ""
          : ";expires=" + exdate.toUTCString() + "; path=/;");
      document.cookie = cKey + "=" + cVal;
    }; // end setCookie()

    // removeCookie() function - local only, clears the cookie for future use
    var removeCookie = function(cookieName) {
      document.cookie =
        cookieName + "=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;";
    }; // end removeCookie()

    // getMonthText() function - local only, called to return the month in full text form
    var getMonthText = function(mn) {
      var rd = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ];
      return rd[mn];
    }; // end getMonthText()

    // getWeekText() function - local only, called to return the week in full text form
    var getWeekText = function(wd) {
      var w = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
      ];
      return w[wd];
    }; // end getWeekText()

    // Initialize
    fetch();
  } // --> end UNEEmergency() -->
})(jQuery, Drupal);
