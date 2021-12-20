<?php

namespace Drupal\une_gdpr\Plugin\Block;

use Drupal\Core\Render;
use Drupal\Core\Block\BlockBase;
use Drupal\Core\Block\BlockPluginInterface;
use Drupal\Core\Form\FormStateInterface;

/**
 * Provides a 'UneGdpr' block.
 *
 * @Block(
 *  id = "une_gdpr",
 *  admin_label = @Translation("Une GDPR"),
 * )
 */
class UneGdpr extends BlockBase implements BlockPluginInterface {

  /**
   * {@inheritdoc}
   */
  public function defaultConfiguration() {

    return [
      'text' => "Please replace this with your GDPR notice.",
    ] + parent::defaultConfiguration();
  }

  /**
   * {@inheritdoc}
   */
  public function blockForm($form, FormStateInterface $form_state) {


    $form = parent::blockForm($form, $form_state);
    $config = $this->getConfiguration();

    $form['text'] = [
      '#type' => 'text_format',
      '#title' => $this->t('Message'),
      '#format' => 'full_html',
      '#description' => $this->t('Enter the message you want to display.'),
      '#default_value' => isset($config['text']) ? $config['text'] : '',
      '#weight' => '0',
    ];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function blockSubmit($form, FormStateInterface $form_state) {

    parent::blockSubmit($form, $form_state);
    $this->configuration['text'] = $form_state->getValue(['text', 'value']);
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    $config = $this->getConfiguration();

    return [
      '#theme' => 'une_gdpr',
      '#text' => check_markup($config['text'], 'full_html'),
      '#attached' => [
        'library' => [
          'une_gdpr/une-gdpr',
        ],
      ],
    ];
  }

}
