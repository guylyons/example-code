<?php

namespace Drupal\une_add_to_calendar\Plugin\Block;

use Drupal\Core\Block\BlockBase;

/**
 * Provides a 'UNE Add to Calendar' Block.
 *
 * @Block(
 *   id = "une_add_to_calendar",
 *   admin_label = @Translation("UNE Add to Calendar Block"),
 *   category = @Translation("UNE Add to Calendar Block"),
 * )
 */
class UneAddToCalendar extends BlockBase {

  /**
   * {@inheritdoc}
   */
  public function build() {
    $request = \Drupal::request();
    $route_match = \Drupal::routeMatch();
    $title = \Drupal::service('title_resolver')->getTitle($request, $route_match->getRouteObject());
    $node = \Drupal::routeMatch()->getParameter('node');

    if ($node instanceof \Drupal\node\NodeInterface) {
      // You can get nid and anything else you need from the node object.
      $nid = $node->id();
      $start_date = $node->get('field_start_date')->value;
      $end_date= $node->get('field_end_date')->value;
      $location = $node->get('field_location')->organization;
      $admissions = $node->get('field_admissions')->value;
      return [
        '#title' => '',
        '#description' => [],
        '#theme' => 'une_add_to_calendar',
        '#customvar' => [
          'title' => $title,
          'start_date' => $start_date,
          'end_date' => $end_date,
          'location' => $location,
          'details' => $admissions
        ],
        '#cache' => [
          'contexts' => ['url'],
          'tags' => ['node:'.$nid],
        ],
      ];
    }
  }
}
