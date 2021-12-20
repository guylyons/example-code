<?php

namespace Drupal\une_alerts\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Une Alerts Controller.
 * requests XML from Blackboard RSS feed
 * and delivers as JSON from UNE.edu.
 */
class UneAlertsController extends ControllerBase {

  // Used for the tier override setting
  // tier_has_override()
  const ON = 1, OFF = 0;

  /**
   * Alerts()
   *
   * The registered route for /alerts and for /emergency/feed/feed.json
   * call this function. It collects two XML feeds and merges them
   * into one JSON response to be handled by the JavaScript in
   * /assets/une_alerts.js.
   */
  public function alerts() {

    $config = \Drupal::config('une_alerts.settings');

    $tier1_uri = $config->get('alerts.tier1_url');
    $tier2_uri = $config->get('alerts.tier2_url');

    $tier1_response = $this->get_xml_by_uri($tier1_uri);
    $tier2_response = $this->get_xml_by_uri($tier2_uri);

    $tier_array = [
      'tier1' => $tier1_response,
      'tier2' => $tier2_response,
    ];

    $this->build_items_array('tier1', $tier_array);
    $this->build_items_array('tier2', $tier_array);

    return JsonResponse::create($tier_array);
  }

  /**
   * Build_items_array()
   *
   * This will build the structure for what is output
   * in JSON. It will either grab values from Blackboard
   * to be used in the new structure, or it will get its
   * values from the CMS.
   */
  private function build_items_array($tier, &$tier_array) {

    // Configuration values from the CMS.
    $config = \Drupal::config('une_alerts.settings');

    $override_title = $config->get("alerts.{$tier}_override_title");
    $override_description = $config->get("alerts.{$tier}_override_description");
    $override_datetime = $config->get("alerts.{$tier}_override_datetime");

    // Convert the XML object to a PHP array.
    $tier_array[$tier] = $this->xml_to_array($tier_array[$tier]);
    $tier_array[$tier]["items"] = [];

    $blackboard_has_item = !empty($tier_array[$tier]["channel"]["item"]);
    $override_is_on = $this->tier_has_override($tier);

    if ($override_is_on) {

      $title =       $override_title;
      $description = $override_description;
      $datetime =    $override_datetime;
      $timestamp =   strtotime($override_datetime);

    } elseif ($blackboard_has_item) {

      $item = $tier_array[$tier]["channel"]["item"];

      $title =       $item["title"];
      $description = $item["description"];
      $timestamp =   strtotime($item["pubDate"]);

    } else {
      return;
    }

    $dow = date("D", $timestamp);
    $propperDate = date("M j, Y", $timestamp);
    $propperTime = date("h:i A", $timestamp);

    $tier_array_items[0] = [
        'title' =>       (string) $title,
        'description' => (string) $description,
        // 'rawDate' =>     (string) $datetime,
        'propperDate' => (string) $propperDate,
        'propperTime' => (string) $propperTime,
        'dow' =>                  $dow,
        'timestamp' =>            $timestamp,
        'timezone' =>             date_default_timezone_get(),
    ];

    /**
     * If there are values in the CMS and override is
     * checked, this will build the array for the tier
     * being used. Depedning on tier, there are different
     * descriptions.
     *
     * Otherwise, it will still build an items array based
     * on what it finds for "item" in the original XML feed
     *
     * The output should look like:
     *
     * tierN:
     *  title: "Category N"
     *  description: "Somethign descriptive"
     *  items:
     *    0: <-- will have key value pairs from the above $tier_array_items
     *
     *   OR
     *
     *  items: [] <-- empty set
     */
    if ($this->tier_has_override($tier)) {

      if ($tier === 'tier1') {
        $tier_array[$tier] = [
          'title' => "Category 1",
          'description' => "This is the overridden value for a Category 1 event, which includes Active Shooter, Person on Campus with a gun, Major Chemical Spill with imminent risk to health and safety of campus, Building Explosion, Bomb Threat Affecting Entire Campus.",
          'items' => $tier_array_items,
        ];
      } else if ($tier === 'tier2') {
        $tier_array[$tier] = [
          'title' => "Category 2",
          'description' => "This is the overridden value for a Category 2 event, which includes Major Fire, Major crime Bomb Threat affecting specified target, Significant weather emergency requiring evacuation or shelter in place, Significant crime on campus resulting in injury.",
          'items' => $tier_array_items,
        ];
      }

    } else {

      if (!empty($tier_array[$tier]["channel"]["item"])) {
        $tier_array[$tier] = [
          'title' => (string) $title,
          'description' => (string) $description,
          'items' => $tier_array_items,
        ];
      } else {
        $tier_array[$tier] = [
          'title' => $tier,
          'description' => "This data set is empty",
          'items' => [],
        ];
      }
    }
  }

  /**
   * Tier_has_override()
   *
   * Return @boolean.
   */
  private function tier_has_override($tier) {

    $config = \Drupal::config('une_alerts.settings');
    $tier_override_setting = $config->get("alerts.{$tier}_override");

    if ($tier_override_setting === self::ON) {
      return TRUE;
    }
    else {
      return FALSE;
    }
  }

  /**
   * Get_xml_by_uri()
   *
   * Return @string.
   *
   * This function is used to make a GET request
   * to two Blackboard RSS feeds. Blackboard will
   * return XML for these feeds. This function
   * will load the string as a SimpleXML object
   * so that the values can be manipulated using the
   * SimpleXML api.
   */
  private function get_xml_by_uri(string $uri) {

    $client = \Drupal::httpClient();
    $response = $client->request('GET', $uri);
    $response = $response->getBody();
    $xml = simplexml_load_string($response);

    return $xml;
  }

  /**
   * Xml_to_array()
   *
   * Return @array.
   *
   * This function takes the XML as its source
   * and converts it into JSON, then decodes it
   * again to convert it into a native PHP
   * object. This is done to allow easier
   * manipulation of the values that will
   * finally be output as JSON via the /alerts
   * endpoint.
   */
  private function xml_to_array($xml) {

    $json = json_encode($xml);
    $array = json_decode($json, TRUE);

    return $array;
  }

}
