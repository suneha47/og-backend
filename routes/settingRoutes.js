const express     = require('express');
const router      = express.Router();
const SiteSetting = require('../models/SiteSetting');
const auth        = require('../middleware/authMiddleware');

const DEFAULTS = {
  hero_badge:      '✦ New Arrivals Every Week',
  hero_h1:         'OG',
  hero_subtitle:   'Premium fashion accessories for those who define their own standard — straight from Zira, Punjab.',
  hero_bg:         '',
  ticker_text:     '',
  promo_title:     'New Arrivals<br><span class="gold-txt">Up to 30% Off</span>',
  promo_sub:       'Elevate your style with our freshly curated seasonal collection.',
  contact_phone:   '+91 81468-05002',
  contact_email:   'info@ogaccessories47.com',
  contact_address: 'Zira, Punjab, India',
  contact_wa:      '918146805002',
  social_insta:    '',
  social_fb:       '',
  map_embed:       'https://maps.google.com/maps?q=Zira+Ferozepur+Punjab+India&output=embed&z=14',
};

// GET — public (used by homepage and contact page)
router.get('/', async (req, res) => {
  try {
    const docs = await SiteSetting.find({});
    const settings = { ...DEFAULTS };
    docs.forEach(d => { settings[d.key] = d.value; });
    res.json(settings);
  } catch (e) {
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// POST — admin only (saves settings)
router.post('/', auth, async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await SiteSetting.findOneAndUpdate(
        { key },
        { value },
        { upsert: true, new: true }
      );
    }
    res.json({ message: 'Settings saved successfully' });
  } catch (e) {
    res.status(500).json({ message: 'Error saving settings' });
  }
});

module.exports = router;
