function sanitize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\[\]{}()]/g, '').replace(/\s+/g, ' ').trim();
}

function capitalizeSentences(str) {
  return str.replace(/(^|\.\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
}

function getTopicWords(prompt) {
  const cleaned = sanitize(prompt).toLowerCase();
  const stopWords = new Set(['how', 'to', 'a', 'an', 'the', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'may', 'might', 'shall', 'should', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'create', 'design', 'make', 'build', 'launch', 'use', 'using', 'promote', 'market', 'your', 'our', 'its', 'their']);
  return cleaned.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w)).slice(0, 6);
}

function generateDynamicScenes(prompt) {
  const cleaned = sanitize(prompt).toLowerCase();
  const topic = capitalizeSentences(sanitize(prompt));
  const topicWords = getTopicWords(prompt);
  const topicName = topicWords.length > 0 ? topicWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null;

  if (cleaned.includes('movie') || cleaned.includes('film') || (cleaned.includes('poster') && cleaned.includes('figma'))) {
    const isFigmaDesign = cleaned.includes('figma');
    if (isFigmaDesign || cleaned.includes('poster') || cleaned.includes('reveal')) {
      const script = isFigmaDesign
        ? `"${topic}"\n\nScene 1: Open Figma and create a vertical poster frame (1080x1920).\nScene 2: Add a dramatic background image, character silhouette, and color overlay.\nScene 3: Place the movie title with bold readable typography and release date.\nScene 4: Add cinematic effects, adjust lighting, and export the final poster.`
        : `${topic}\n\nScene 1: Dark cinema background with hidden poster silhouette.\nScene 2: Slow spotlight reveal over the main movie title.\nScene 3: Character and visual elements appear with dramatic motion.\nScene 4: Final poster reveal with release date and call to action.`;

      const hook = isFigmaDesign ? 'Turn a blank Figma frame into a cinematic movie poster.' : 'Every great story begins with a single image.';
      const scenes = isFigmaDesign ? [
        { title: 'Setup Canvas', visual: 'Open Figma dashboard, create new file, select vertical poster dimensions 1080x1920, set up grid guides.', voiceover: 'Start by opening Figma and creating a new file. Choose vertical poster dimensions that match standard movie poster formats.', duration: 8 },
        { title: 'Build the Visual', visual: 'Add dramatic background gradient, import character silhouette image, apply color overlay with blend modes, layer atmospheric effects.', voiceover: 'Build your visual foundation with a dramatic background and character silhouette. Use color overlays to create mood and depth.', duration: 10 },
        { title: 'Design the Typography', visual: 'Add movie title with bold display font, position at optical center, add tagline below in lighter weight, include release date and credits.', voiceover: 'Place your movie title with bold typography that commands attention. Add supporting text hierarchy for maximum readability.', duration: 10 },
        { title: 'Final Polish', visual: 'Fine-tune layer opacity, add film grain or light leak effects, adjust contrast, open export dialog, select PNG format.', voiceover: 'Polish every detail. Adjust lighting effects, fine-tune colors, and export your finished movie poster in high resolution.', duration: 6 },
      ] : [
        { title: 'The Tease', visual: 'Dark cinema theater background, a large covered poster frame center stage, subtle spotlight edges, mysterious atmosphere.', voiceover: hook, duration: 8 },
        { title: 'The Reveal', visual: 'Spotlight slowly brightens over the movie title, dramatic shadows, typography emerges from darkness.', voiceover: 'As the light reveals our title, the world gets its first glimpse of the vision behind the film.', duration: 8 },
        { title: 'Character Introduction', visual: 'Key character silhouettes appear around the title, visual elements fade in with motion blur effect.', voiceover: 'Meet the characters that will take you on this unforgettable journey.', duration: 8 },
        { title: 'Final Poster', visual: 'Full poster composition revealed with all elements, release date, and CTA overlay.', voiceover: 'The complete poster. Ready for the world. Share it, save it, and be part of the story.', duration: 6 },
      ];
      return { script, scenes, hook };
    }
    return {
      script: `${topic}\n\nOpening scene setting the mood.\nCharacter introduction and conflict.\nKey moments and turning points.\nClimax and resolution.`,
      scenes: [
        { title: 'Opening Scene', visual: `Cinematic establishing shot related to ${topicName || topic}, mood lighting, setting the atmosphere.`, voiceover: `Our story begins with ${topicName || topic} — a journey that will captivate and inspire.`, duration: 8 },
        { title: 'The Journey', visual: 'Character moments, key locations, emotional beats that drive the narrative forward.', voiceover: 'Every frame is crafted to pull you deeper into the world we have created.', duration: 8 },
        { title: 'Climax', visual: 'High-stakes moment, dramatic lighting, peak emotional intensity.', voiceover: 'This is the moment everything changes. The turning point you will never forget.', duration: 8 },
        { title: 'Resolution', visual: 'Quiet closing shot, end credits begin to roll, emotional payoff.', voiceover: 'And so our story ends... or perhaps it is just the beginning.', duration: 6 },
      ],
    };
  }

  if (cleaned.includes('poster') || cleaned.includes('design') || cleaned.includes('figma') || cleaned.includes('canva') || cleaned.includes('graphic')) {
    const isFigma = cleaned.includes('figma');
    if (isFigma) {
      return {
        script: `${topic}\n\nScene 1: Open Figma and create a vertical poster frame (1080x1920).\nScene 2: Add a dramatic background, character image, and color overlay.\nScene 3: Place the movie title with bold readable typography and release info.\nScene 4: Add cinematic effects, adjust lighting, and export final poster.`,
        scenes: [
          { title: 'Setup Canvas', visual: 'Open Figma dashboard, create new file, select vertical poster dimensions 1080x1920, set up grid guides.', voiceover: 'Start by opening Figma and creating a new file. Choose vertical poster dimensions that match standard poster formats.', duration: 8 },
          { title: 'Build the Visual', visual: 'Add dramatic background gradient, import character silhouette image, apply color overlay with blend modes, layer atmospheric effects.', voiceover: 'Build your visual foundation with a dramatic background and central imagery. Use color overlays to create mood and depth.', duration: 10 },
          { title: 'Design the Typography', visual: 'Add headline with bold display font, position at optical center, add supporting text below, include CTA or tagline.', voiceover: 'Place your headline with bold typography that commands attention. Add supporting text hierarchy for maximum readability.', duration: 10 },
          { title: 'Final Polish', visual: 'Fine-tune layer opacity, adjust contrast, open export dialog, select PNG format, save to project.', voiceover: 'Polish every detail, fine-tune colors, and export your finished poster design in high resolution.', duration: 6 },
        ],
      };
    }
    return {
      script: `${topic}\n\nStep 1: Plan your design concept and gather reference materials.\nStep 2: Set up canvas and build the background composition.\nStep 3: Layer in typography, imagery, and visual elements.\nStep 4: Refine details and export the final poster.`,
      scenes: [
        { title: 'Concept Planning', visual: `Design mood board, color palette selection, reference images related to ${topicName || 'your poster topic'}.`, voiceover: `Start with a clear vision. Gather inspiration and plan your design around ${topicName || 'your creative concept'}.`, duration: 8 },
        { title: 'Build the Composition', visual: 'Canvas setup with background gradient, geometric shapes, and visual balance.', voiceover: 'Set up your canvas and build a strong background. Use color and shape to create visual interest.', duration: 8 },
        { title: 'Add Content Elements', visual: 'Typography layers being added, images placed, icons and graphic elements arranged.', voiceover: 'Layer in your headline, supporting text, and imagery. Create a clear visual hierarchy.', duration: 8 },
        { title: 'Final Output', visual: 'Completed poster design, export settings dialog, high-resolution preview.', voiceover: 'Review, polish, and export your poster. Your design is ready to share with the world.', duration: 6 },
      ],
    };
  }

  if (cleaned.includes('skincare') || cleaned.includes('beauty') || cleaned.includes('cosmetic')) {
    const isOrganic = cleaned.includes('organic') || cleaned.includes('natural');
    return {
      script: `${topic}\n\nIntroducing the product line and its natural ingredients.\nShowing the benefits and real results.\nCustomer testimonials and social proof.\nStrong call to action.`,
      scenes: [
        { title: 'Product Introduction', visual: `${isOrganic ? 'Fresh organic ingredients, botanical extracts, natural packaging' : 'Product lineup on clean white background, luxury beauty setting, soft lighting'}.`, voiceover: `${isOrganic ? 'Made with 100% natural, organic ingredients. Your skin deserves the purest care.' : 'Introducing our premium beauty line. Science meets nature in every bottle.'}`, duration: 8 },
        { title: 'Key Benefits', visual: 'Close-up of product application, skin texture improvement, active ingredient visualization.', voiceover: 'Packed with active ingredients that deliver visible results. Healthier, radiant skin starts here.', duration: 8 },
        { title: 'Real Results', visual: 'Before and after comparison, happy customer photos, glowing skin close-ups.', voiceover: 'Real people, real results. See the transformation our customers are raving about.', duration: 8 },
        { title: 'Get Yours', visual: 'Product on shelf, mobile order screen, delivery packaging.', voiceover: 'Ready to transform your skincare routine? Order now and experience the difference.', duration: 6 },
      ],
    };
  }

  if (cleaned.includes('hospital') || cleaned.includes('appointment') || cleaned.includes('doctor') || cleaned.includes('clinic') || cleaned.includes('health')) {
    const isChatbot = cleaned.includes('chatbot') || cleaned.includes('ai');
    if (isChatbot) {
      return {
        script: `${topic}\n\nHow a simple chatbot can transform patient scheduling.\nPatients book appointments in seconds, 24/7.\nReduced no-shows with smart reminders.\nHealthcare providers focus on care, not admin.`,
        scenes: [
          { title: 'The Problem', visual: 'Busy reception desk with overflowing phone lines, frustrated patients waiting, paper calendar.', voiceover: 'Manual scheduling wastes valuable time for both patients and healthcare providers.', duration: 8 },
          { title: 'AI Chatbot Solution', visual: 'Chatbot interface on phone showing appointment booking flow, calendar selection, confirmation screen.', voiceover: 'Our AI chatbot handles patient bookings 24/7. No phone calls, no wait times.', duration: 8 },
          { title: 'Smart Features', visual: 'Automated reminders sent to phone, easy rescheduling flow, available slots displayed clearly.', voiceover: 'Smart reminders slash no-show rates. Patients can reschedule anytime with a single tap.', duration: 8 },
          { title: 'Better Care', visual: 'Doctor focused on patient, streamlined reception area, happy patient leaving.', voiceover: 'Providers focus on what matters — patient care. Everyone wins with smarter scheduling.', duration: 6 },
        ],
      };
    }
    return {
      script: `${topic}\n\nModern healthcare solutions for better patient experience.\nStreamlined processes and digital transformation.\nImproved outcomes through technology.`,
      scenes: [
        { title: 'Modern Healthcare', visual: 'Clean modern clinic interior, digital check-in kiosk, friendly staff.', voiceover: `Welcome to the future of healthcare. ${topicName || 'Modern solutions'} are transforming patient experiences.`, duration: 8 },
        { title: 'Digital Solutions', visual: 'Online booking interface, patient portal, telehealth consultation screen.', voiceover: 'Digital tools make healthcare more accessible. Book, consult, and manage care from anywhere.', duration: 8 },
        { title: 'Better Outcomes', visual: 'Doctor reviewing digital chart, patient satisfaction graph, healthy community.', voiceover: 'Technology enables better outcomes. Faster diagnoses, personalized care, happier patients.', duration: 6 },
      ],
    };
  }

  if (cleaned.includes('chatbot') || cleaned.includes('ai chatbot')) {
    return {
      script: `${topic}\n\nWhat is an AI chatbot and how it works.\nKey features and capabilities.\nReal-world applications and benefits.\nGet started with your own chatbot.`,
      scenes: [
        { title: 'What is an AI Chatbot', visual: 'Chatbot interface on multiple devices, conversation bubbles, AI brain visualization.', voiceover: 'An AI chatbot understands natural language and provides instant, intelligent responses to your customers.', duration: 8 },
        { title: 'Key Capabilities', visual: 'Chatbot answering questions, booking appointments, processing orders, providing support.', voiceover: 'From customer support to sales, our chatbot handles it all. Available 24/7, never takes a day off.', duration: 8 },
        { title: 'Real Applications', visual: 'Businesses using chatbots: healthcare booking, e-commerce support, restaurant reservations.', voiceover: 'Businesses across every industry are using AI chatbots to improve response times and reduce costs.', duration: 8 },
        { title: 'Get Started', visual: 'Setup wizard interface, customization options, deployment preview.', voiceover: 'Ready to transform your customer experience? Set up your AI chatbot in minutes.', duration: 6 },
      ],
    };
  }

  if (cleaned.includes('coding') || cleaned.includes('course') || cleaned.includes('learn') || cleaned.includes('education') || cleaned.includes('training')) {
    return {
      script: `${topic}\n\nWhy learning these skills matters.\nCurriculum overview from basics to advanced.\nHands-on projects and real-world practice.\nStart your learning journey today.`,
      scenes: [
        { title: 'Why It Matters', visual: `Student working on ${topicName || 'course material'}, career path visualization, industry demand chart.`, voiceover: `${topicName || 'These skills'} open doors to exciting career opportunities and personal growth.`, duration: 8 },
        { title: 'What You Will Learn', visual: 'Course modules displayed, interactive lesson interface, code editor or learning platform.', voiceover: 'Our structured curriculum takes you from fundamentals to mastery through hands-on projects.', duration: 8 },
        { title: 'Learn by Doing', visual: 'Student building project, portfolio showcase, collaboration with peers.', voiceover: 'Build real projects that become part of your portfolio. Learn by creating, not just watching.', duration: 8 },
        { title: 'Start Today', visual: 'Enrollment screen, student dashboard, graduation ceremony.', voiceover: 'Join thousands of successful learners. Start your learning journey today.', duration: 6 },
      ],
    };
  }

  if (cleaned.includes('bike') || cleaned.includes('electric') || cleaned.includes('vehicle') || cleaned.includes('scooter') || cleaned.includes('cycle')) {
    return {
      script: `${topic}\n\nThe future of transportation is here.\nDesign, performance, and range.\nReal rider experiences.\nMake the switch to electric.`,
      scenes: [
        { title: 'Future of Mobility', visual: `${topicName || 'Electric vehicle'} in urban setting, city skyline, eco-friendly commuting scene.`, voiceover: `The future of transportation is electric, and ${topicName || 'it'} is leading the way.`, duration: 8 },
        { title: 'Design and Performance', visual: 'Product design close-ups, battery technology infographic, speed and range display.', voiceover: 'Engineered for performance. Every component is designed for reliability, efficiency, and style.', duration: 8 },
        { title: 'Rider Experience', visual: 'Person riding through city, intuitive dashboard display, mobile app connectivity.', voiceover: 'Smooth, quiet, and responsive. The rider experience is unmatched in comfort and control.', duration: 8 },
        { title: 'Join the Movement', visual: 'Group of riders, customer testimonial, unboxing new vehicle.', voiceover: 'Thousands have made the switch to electric. Join the movement and ride into the future.', duration: 6 },
      ],
    };
  }

  if (cleaned.includes('launch') || cleaned.includes('product') || cleaned.includes('brand') || cleaned.includes('startup') || cleaned.includes('campaign')) {
    return {
      script: `${topic}\n\nIntroducing the product and what makes it unique.\nKey features and benefits for customers.\nMarket opportunity and growth potential.\nCall to action and next steps.`,
      scenes: [
        { title: 'Introducing the Product', visual: `Product hero shot, ${topicName || 'the product'} in use, team behind the brand.`, voiceover: `Meet ${topicName || 'the product'} — designed to solve real problems for real people.`, duration: 8 },
        { title: 'Key Features', visual: 'Feature highlights, user interface or product details, comparison with alternatives.', voiceover: 'Packed with features that make a real difference. Simple, powerful, and effective.', duration: 8 },
        { title: 'Why It Matters', visual: 'Market opportunity chart, customer pain points, solution visualization.', voiceover: 'The market is ready for a better solution. This is the right product at the right time.', duration: 8 },
        { title: 'Get Involved', visual: 'Signup or purchase screen, onboarding flow, community of users.', voiceover: 'Be part of the launch. Sign up today and be among the first to experience the future.', duration: 6 },
      ],
    };
  }

  if (cleaned.includes('organic') || cleaned.includes('natural')) {
    return {
      script: `${topic}\n\nThe power of nature in every product.\nSustainably sourced, ethically made.\nBenefits for you and the planet.\nJoin the natural living movement.`,
      scenes: [
        { title: 'Nature\'s Best', visual: 'Fresh organic ingredients, farm-to-table visuals, natural texture backgrounds.', voiceover: 'Harnessing the power of nature. Every ingredient is carefully sourced for purity and potency.', duration: 8 },
        { title: 'Sustainable Practices', visual: 'Eco-friendly packaging, sustainable farming, community impact.', voiceover: 'We believe in sustainability at every step. Better for you, better for the planet.', duration: 8 },
        { title: 'Real Benefits', visual: 'Product in use, wellness lifestyle, vibrant healthy individuals.', voiceover: 'Natural ingredients work in harmony with your body. Feel the difference of clean, pure products.', duration: 8 },
        { title: 'Go Natural', visual: 'Product lineup, subscription service, happy customers.', voiceover: 'Make the switch to natural. Your body, your home, and the planet will thank you.', duration: 6 },
      ],
    };
  }

  if (topicName) {
    return {
      script: `${topic}\n\nIntroduction to ${topicName}.\nCore concepts and key features.\nPractical applications and use cases.\nGet started with ${topicName}.`,
      scenes: [
        { title: `Introduction to ${topicName}`, visual: `Overview of ${topicName}, key concepts illustrated, relevance to modern audiences.`, voiceover: `Welcome. In this video we explore ${topicName} and how it can transform your approach.`, duration: 8 },
        { title: 'Core Concepts', visual: `Visual breakdown of ${topicName} fundamentals, key terms explained, framework overview.`, voiceover: `Let us break down the core concepts and understand how each element works together.`, duration: 8 },
        { title: 'Practical Applications', visual: `${topicName} in real-world use, implementation examples, best practices.`, voiceover: `Now let us look at how ${topicName} is applied in real-world scenarios.`, duration: 8 },
        { title: `Master ${topicName}`, visual: `Resources, next steps, tools to continue learning about ${topicName}.`, voiceover: `You now understand the fundamentals. Explore these resources to deepen your knowledge.`, duration: 6 },
      ],
    };
  }

  const fallbackTopic = truncate(sanitize(prompt), 50) || 'This Topic';
  return {
    script: `${fallbackTopic}\n\nIntroduction to the topic.\nKey concepts and fundamentals.\nPractical implementation.\nNext steps.`,
    scenes: [
      { title: `Introduction`, visual: `Overview of ${fallbackTopic}, key concepts, and why it matters.`, voiceover: `Welcome. In this video we explore ${fallbackTopic} and its key aspects.`, duration: 8 },
      { title: 'Key Concepts', visual: `Visual breakdown of ${fallbackTopic} fundamentals and framework.`, voiceover: `Let us understand the core concepts behind ${fallbackTopic}.`, duration: 8 },
      { title: 'Practical Guide', visual: `Step-by-step implementation of ${fallbackTopic}, best practices.`, voiceover: `Here is how to apply ${fallbackTopic} effectively in practice.`, duration: 8 },
      { title: 'Next Steps', visual: `Resources, tools, and continued learning for ${fallbackTopic}.`, voiceover: `You now have a solid foundation. Keep exploring and applying these concepts.`, duration: 6 },
    ],
  };
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen).replace(/\s+\S*$/, '') + '...';
}

export function buildVideoContent({ script, scenes, prompt }) {
  const safePrompt = sanitize(prompt || '');
  const content = generateDynamicScenes(safePrompt);

  return {
    script: script || content.script,
    scenes: (scenes && scenes.length > 0) ? scenes : content.scenes,
  };
}
