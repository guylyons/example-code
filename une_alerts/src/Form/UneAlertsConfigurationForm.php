<?php

namespace Drupal\une_alerts\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Datetime\DrupalDateTime;

/**
 * Defines a form that configures forms module settings.
 */
class UneAlertsConfigurationForm extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'une_alerts_admin_settings';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return [
      'une_alerts.settings',
    ];
  }

   /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {
    $config = $this->config('une_alerts.settings');

    $form['rss_feeds'] = array(
      '#type' => 'fieldgroup',
      '#title' => $this->t('Blackboard RSS Feeds'),
    );

    $form['rss_feeds']['tier1_url'] = [
      '#type' => 'textfield',
      '#description' => 'The full URL of the tier 1 emergency feed (e.g. http://rss.blackboardconnect.com/139217/category1/feed.xml).',
      '#title' => $this->t('Tier 1 URL'),
      '#default_value' => $config->get('alerts.tier1_url'),
    ];

    $form['rss_feeds']['tier2_url'] = [
      '#type' => 'textfield',
      '#description' => 'The full URL of the tier 1 emergency feed (e.g. http://rss.blackboardconnect.com/139217/category2/feed.xml).',
      '#title' => $this->t('Tier 2 URL'),
      '#default_value' => $config->get('alerts.tier2_url'),
    ];

    $form['emergency_feeds_override'] = array(
      '#type' => 'fieldgroup',
      '#title' => $this->t('Override Events'),
    );

    // Tier 1

    $form['emergency_feeds_override']['tier1_override'] = array(
      '#type' => 'checkbox',
      '#title' => $this->t('Enable Tier 1 override'),
      '#default_value' => $config->get('alerts.tier1_override'),
      '#description' => $this->t('This allows you to override the <em>Tier 1</em> Blackboard feed, and enter a custom alert'),
    );

    $form['emergency_feeds_override']['tier1_override_title'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Tier 1 override title'),
      '#default_value' => $config->get('alerts.tier1_override_title'),
    ];

    $form['emergency_feeds_override']['tier1_override_description'] = [
      '#type' => 'textarea',
      '#title' => $this->t('Tier 1 override description'),
      '#default_value' => $config->get('alerts.tier1_override_description'),
    ];

    $form['emergency_feeds_override']['tier1_override_datetime'] = array(
      '#type' => 'datetime',
      '#title' => t('Tier 1 override timestamp'),
      '#default_value' => new DrupalDateTime($config->get('alerts.tier1_override_datetime')),
      '#description' => t('Timestamp for emergency event'),
    );

    // Tier 2

    $form['emergency_feeds_override']['tier2_override'] = array(
      '#type' => 'checkbox',
      '#title' => $this->t('Enable Tier 2 override'),
      '#default_value' => $config->get('alerts.tier2_override'),
      '#description' => $this->t('This allows you to override the <em>Tier 2</em> Blackboard feed, and enter a custom alert'),
    );

    $form['emergency_feeds_override']['tier2_override_title'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Tier 2 override title'),
      '#default_value' => $config->get('alerts.tier2_override_title'),
    ];

    $form['emergency_feeds_override']['tier2_override_description'] = [
      '#type' => 'textarea',
      '#title' => $this->t('Tier 2 override description'),
      '#default_value' => $config->get('alerts.tier2_override_description'),
    ];

    $form['emergency_feeds_override']['tier2_override_datetime'] = array(
      '#type' => 'datetime',
      '#title' => t('Tier 2 override timestamp'),
      '#default_value' => new DrupalDateTime($config->get('alerts.tier2_override_datetime')),
      '#description' => t('Timestamp for emergency event'),
    );

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    $values = $form_state->getValues();
    $values['tier1_override_datetime'] = strval($values['tier1_override_datetime']);
    $values['tier2_override_datetime'] = strval($values['tier2_override_datetime']);

    $this->config('une_alerts.settings')
      ->set('alerts', $values)
      ->save();
    parent::submitForm($form, $form_state);
  }

}
