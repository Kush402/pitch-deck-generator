import { logger } from '../../utils/logger.js';
import axios from 'axios';

/**
 * Handles the /pitch-kit command
 * @param {Object} command - The Slack command object
 * @param {Object} client - The Slack Web API client
 */
export async function handlePitchKitCommand(command, client) {
  try {
    // Acknowledge the command immediately
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: "🎬 Starting pitch kit generation...",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🎬 *Starting pitch kit generation...*\n\nI'll help you create a professional pitch kit. Let's start with some basic information:"
          }
        },
        {
          type: "input",
          block_id: "brand_info",
          element: {
            type: "plain_text_input",
            action_id: "brand_info_input",
            placeholder: {
              type: "plain_text",
              text: "Enter your brand information"
            }
          },
          label: {
            type: "plain_text",
            text: "Brand Information",
            emoji: true
          }
        },
        {
          type: "input",
          block_id: "campaign_goals",
          element: {
            type: "plain_text_input",
            action_id: "campaign_goals_input",
            placeholder: {
              type: "plain_text",
              text: "What are your campaign goals?"
            }
          },
          label: {
            type: "plain_text",
            text: "Campaign Goals",
            emoji: true
          }
        },
        {
          type: "input",
          block_id: "target_audience",
          element: {
            type: "plain_text_input",
            action_id: "target_audience_input",
            placeholder: {
              type: "plain_text",
              text: "Who is your target audience?"
            }
          },
          label: {
            type: "plain_text",
            text: "Target Audience",
            emoji: true
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Generate Script",
                emoji: true
              },
              style: "primary",
              action_id: "generate_script"
            }
          ]
        }
      ]
    });

    logger.info(`Pitch kit command initiated by user ${command.user_id} in channel ${command.channel_id}`);
  } catch (error) {
    logger.error('Error handling pitch-kit command:', error);
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: "❌ Sorry, there was an error processing your request. Please try again later."
    });
  }
}

/**
 * Handles the script generation action
 * @param {Object} body - The Slack action body
 * @param {Object} client - The Slack Web API client
 */
export async function handleScriptGeneration(body, client) {
  try {
    const { brand_info, campaign_goals, target_audience } = body.state.values;
    
    // Call the script generation endpoint
    const response = await axios.post(`${process.env.API_BASE_URL}/generate/script`, {
      brandInfo: brand_info.brand_info_input.value,
      campaignGoals: campaign_goals.campaign_goals_input.value,
      targetAudience: target_audience.target_audience_input.value,
      model: 'gpt4'
    });

    // Post the generated script
    await client.chat.postMessage({
      channel: body.channel.id,
      text: "📝 Here's your generated script:",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "📝 *Generated Script:*\n\n" + response.data.script
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Generate Media",
                emoji: true
              },
              style: "primary",
              action_id: "generate_media"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Edit Script",
                emoji: true
              },
              action_id: "edit_script"
            }
          ]
        }
      ]
    });
  } catch (error) {
    logger.error('Error generating script:', error);
    await client.chat.postEphemeral({
      channel: body.channel.id,
      user: body.user.id,
      text: "❌ Sorry, there was an error generating your script. Please try again."
    });
  }
}

/**
 * Handles the media generation action
 * @param {Object} body - The Slack action body
 * @param {Object} client - The Slack Web API client
 */
export async function handleMediaGeneration(body, client) {
  try {
    // Call the media generation endpoint
    const response = await axios.post(`${process.env.API_BASE_URL}/generate/media`, {
      type: 'video',
      params: {
        script: body.message.text,
        style: 'cinematic'
      }
    });

    // Post the generated media
    await client.chat.postMessage({
      channel: body.channel.id,
      text: "🎥 Here's your generated video:",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🎥 *Generated Video:*\n\n" + response.data.url
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Store Assets",
                emoji: true
              },
              style: "primary",
              action_id: "store_assets"
            }
          ]
        }
      ]
    });
  } catch (error) {
    logger.error('Error generating media:', error);
    await client.chat.postEphemeral({
      channel: body.channel.id,
      user: body.user.id,
      text: "❌ Sorry, there was an error generating your media. Please try again."
    });
  }
} 