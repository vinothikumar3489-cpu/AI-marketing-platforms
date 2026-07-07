function sanitize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\[\]{}()]/g, '').replace(/\s+/g, ' ').trim();
}

function capitalizeSentences(str) {
  return str.replace(/(^|\.\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
}

function getTopicWords(prompt) {
  const cleaned = sanitize(prompt).toLowerCase();
  const stopWords = new Set(['how', 'to', 'a', 'an', 'the', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'may', 'might', 'shall', 'should', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'create', 'design', 'make', 'build', 'launch', 'use', 'using', 'promote', 'market']);
  return cleaned.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w)).slice(0, 4);
}

function generateScenes(prompt) {
  const cleaned = sanitize(prompt).toLowerCase();
  const topic = capitalizeSentences(sanitize(prompt));

  if (cleaned.includes('poster') || cleaned.includes('design') || cleaned.includes('figma') || cleaned.includes('canva') || cleaned.includes('graphic')) {
    return {
      script: `${topic}\n\nStep 1: Set up your canvas with the right dimensions for your platform.\nStep 2: Choose a color scheme and background that matches your brand.\nStep 3: Add visual elements — images, shapes, and icons to create interest.\nStep 4: Layer in typography with clear hierarchy for readability.\nStep 5: Export and share your finished design.`,
      scenes: [
        { title: 'Set Up Your Canvas', visual: 'Open design tool, create new project, select canvas dimensions for social media or print.', voiceover: 'Start by opening your design tool and creating a new project. Choose dimensions that match your target platform.', duration: 8 },
        { title: 'Choose Colors and Background', visual: 'Select brand colors, apply gradient or solid background, add subtle patterns or textures.', voiceover: 'Pick a color scheme that represents your brand. Apply a background and add subtle visual texture.', duration: 8 },
        { title: 'Add Visual Elements', visual: 'Import images, draw shapes, arrange icons and graphic elements in a balanced layout.', voiceover: 'Bring in images and design elements. Arrange them thoughtfully to guide the viewer\'s eye.', duration: 10 },
        { title: 'Add Typography', visual: 'Add text layers, set headline in bold font, align subtext, adjust spacing and hierarchy.', voiceover: 'Add your headline and supporting text. Use font size and weight to create a clear visual hierarchy.', duration: 8 },
        { title: 'Export and Share', visual: 'Go to export menu, select PNG or PDF, choose quality settings, save final file.', voiceover: 'Export your design in the right format and share it with your audience.', duration: 6 },
      ],
    };
  }

  if (cleaned.includes('skincare') || cleaned.includes('beauty') || cleaned.includes('cosmetic')) {
    return {
      script: `${topic}\n\nIntroduce the skincare concern and why natural ingredients matter.\nShow the product line and key ingredients.\nHighlight benefits with customer testimonials.\nEnd with a strong call to action.`,
      scenes: [
        { title: 'The Problem', visual: 'Close-up of skin concerns, environmental stressors, crowded beauty shelf.', voiceover: 'Many skincare products are filled with harsh chemicals. Your skin deserves better.', duration: 8 },
        { title: 'Natural Ingredients', visual: 'Fresh botanical ingredients, lab testing, natural extracts being prepared.', voiceover: 'Our formulas use only natural, ethically sourced ingredients backed by dermatological research.', duration: 10 },
        { title: 'Real Results', visual: 'Before and after photos, happy customers, glowing skin close-ups.', voiceover: 'Customers see real improvements in skin texture, hydration, and overall radiance.', duration: 8 },
        { title: 'Start Your Journey', visual: 'Product lineup, mobile ordering interface, delivery packaging.', voiceover: 'Ready for healthier skin? Order today and experience the difference of clean beauty.', duration: 6 },
      ],
    };
  }

  if (cleaned.includes('hospital') || cleaned.includes('appointment') || cleaned.includes('doctor') || cleaned.includes('clinic') || cleaned.includes('health')) {
    return {
      script: `${topic}\n\nThe challenge of manual appointment scheduling.\nHow AI automation simplifies booking.\nKey features: reminders, rescheduling, and availability.\nPatient benefits and provider efficiency.\nGet started today.`,
      scenes: [
        { title: 'Scheduling Challenges', visual: 'Busy reception desk, overflowing calendar, frustrated patients on phone.', voiceover: 'Manual appointment scheduling wastes time for both patients and healthcare providers.', duration: 8 },
        { title: 'AI-Powered Solution', visual: 'Chatbot interface showing appointment booking, calendar sync, confirmation screen.', voiceover: 'Our AI chatbot handles bookings 24/7. Patients book in seconds, not minutes.', duration: 10 },
        { title: 'Smart Features', visual: 'Automated reminders on phone, rescheduling flow, available slots displayed.', voiceover: 'Smart reminders reduce no-shows. Patients can reschedule anytime without phone calls.', duration: 8 },
        { title: 'Better Healthcare Access', visual: 'Happy patient at clinic, doctor with tablet, streamlined reception area.', voiceover: 'Providers focus on care, not admin. Patients enjoy a seamless experience from booking to visit.', duration: 6 },
      ],
    };
  }

  if (cleaned.includes('coding') || cleaned.includes('course') || cleaned.includes('learn') || cleaned.includes('education') || cleaned.includes('training') || cleaned.includes('student')) {
    return {
      script: `${topic}\n\nWhy learning to code opens new opportunities.\nCourse curriculum overview: from basics to real projects.\nHands-on practice with expert mentorship.\nBuild your portfolio and land your dream job.`,
      scenes: [
        { title: 'Why Learn to Code', visual: 'Student at computer, code on screen, career growth chart, tech company logos.', voiceover: 'Coding skills open doors to high-demand careers in tech, finance, and beyond.', duration: 8 },
        { title: 'Structured Curriculum', visual: 'Course modules displayed, lesson interface, interactive coding exercises.', voiceover: 'Our curriculum takes you from fundamentals to advanced concepts through hands-on projects.', duration: 10 },
        { title: 'Learn by Building', visual: 'Students collaborating, project demo, portfolio website showcase.', voiceover: 'Build real applications that go into your portfolio. Learn by doing, not just watching.', duration: 8 },
        { title: 'Start Your Journey', visual: 'Graduation ceremony, job offer letter, developer at work.', voiceover: 'Join thousands of successful graduates. Start your coding journey today.', duration: 6 },
      ],
    };
  }

  if (cleaned.includes('bike') || cleaned.includes('electric') || cleaned.includes('vehicle') || cleaned.includes('scooter') || cleaned.includes('cycle')) {
    return {
      script: `${topic}\n\nThe future of transportation is electric.\nDesign and engineering excellence.\nPerformance, range, and features.\nReal rider experiences.\nMake the switch today.`,
      scenes: [
        { title: 'The Future of Mobility', visual: 'City streets with electric vehicles, charging stations, eco-friendly commute scenes.', voiceover: 'Electric vehicles are transforming how we move. Cleaner, quieter, and more efficient.', duration: 8 },
        { title: 'Engineering Excellence', visual: 'Product design sketches, battery technology, motor assembly, quality testing.', voiceover: 'Built with precision engineering and the latest battery technology for reliable performance.', duration: 10 },
        { title: 'Rider Experience', visual: 'Person riding through city, dashboard display, app connectivity features.', voiceover: 'Intuitive controls, smartphone connectivity, and a smooth, responsive ride every time.', duration: 8 },
        { title: 'Join the Movement', visual: 'Group of riders, delivery fleet, customer unboxing, happy testimonial.', voiceover: 'Thousands of riders have made the switch. Experience the future of commuting today.', duration: 6 },
      ],
    };
  }

  if (cleaned.includes('launch') || cleaned.includes('product') || cleaned.includes('brand') || cleaned.includes('startup') || cleaned.includes('campaign')) {
    return {
      script: `${topic}\n\nIntroducing the product and the problem it solves.\nKey features and benefits.\nCustomer proof and social validation.\nCall to action and next steps.`,
      scenes: [
        { title: 'Introducing the Product', visual: 'Product hero shot, team working, problem illustration, target audience.', voiceover: 'Meet the product designed to solve your biggest challenges. Built for modern professionals.', duration: 8 },
        { title: 'Key Features', visual: 'Feature highlights, interface screenshots, comparison chart, demo clips.', voiceover: 'Packed with features that make a real difference. Simple, powerful, and effective.', duration: 10 },
        { title: 'Trusted by Customers', visual: 'Customer testimonials, rating stars, case study results, logo wall.', voiceover: 'Join thousands of satisfied customers who have transformed their workflow.', duration: 8 },
        { title: 'Get Started Today', visual: 'Signup screen, onboarding flow, team using product, success dashboard.', voiceover: 'Ready to take the next step? Start your journey today with a free trial.', duration: 6 },
      ],
    };
  }

  const topicWords = getTopicWords(prompt);
  const topicName = topicWords.length > 0 ? topicWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Your Project';

  return {
    script: `${topic}\n\nIntroduction to ${topicName}.\nKey concepts and fundamentals.\nPractical implementation steps.\nTips and best practices.\nNext steps and resources.`,
    scenes: [
      { title: `Introduction to ${topicName}`, visual: `Overview of ${topicName}, key concepts, and why it matters for your audience.`, voiceover: `Welcome. In this guide we will explore ${topicName} and how it can benefit you.`, duration: 8 },
      { title: 'Core Concepts', visual: `Visual breakdown of ${topicName} fundamentals, key terms, and framework.`, voiceover: `Let us break down the core concepts and understand how each piece fits together.`, duration: 10 },
      { title: 'Practical Steps', visual: `Step-by-step implementation guide, best practices, common pitfalls.`, voiceover: `Now let us walk through the practical steps to implement this effectively.`, duration: 10 },
      { title: 'Next Steps', visual: `Resources, tools, community, and call to action for continued learning.`, voiceover: `You now have a solid foundation. Explore these resources to go further.`, duration: 6 },
    ],
  };
}

export function buildVideoContent({ script, scenes, prompt }) {
  const safePrompt = sanitize(prompt || '');
  const content = generateScenes(safePrompt);

  return {
    script: script || content.script,
    scenes: (scenes && scenes.length > 0) ? scenes : content.scenes,
  };
}
