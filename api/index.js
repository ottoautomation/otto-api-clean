const Airtable = require('airtable');

// Configure Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base('appJs6HW5kNwrC8ig');

module.exports = async (req, res) => {
  // Set CORS headers on every request
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, email, password, clientId } = req.query;

  try {
    // LOGIN ACTION
    if (action === 'login') {
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
          success: false
        });
      }

      // Fetch client from Airtable
      const records = await base('Clients (for login)')
        .select({
          filterByFormula: `AND({Email} = '${email}', {Password} = '${password}')`
        })
        .firstPage();

      if (records.length === 0) {
        return res.status(401).json({
          error: 'Invalid credentials',
          success: false
        });
      }

      const client = records[0];
      return res.status(200).json({
        success: true,
        user: {
          clientId: client.fields['Client ID'],
          name: client.fields['Company Name'],
          email: client.fields['Email'],
          role: client.fields['Role'] || 'Client'
        }
      });
    }

    // GET DASHBOARD DATA ACTION
    if (action === 'getDashboard') {
      if (!clientId) {
        return res.status(400).json({
          error: 'Client ID is required',
          success: false
        });
      }

      // Fetch leads for this client
      const leadsRecords = await base('Leads1')
        .select({
          filterByFormula: `{Client ID} = '${clientId}'`
        })
        .all();

      const leads = leadsRecords.map(record => ({
        id: record.id,
        name: record.fields['Name'] || '',
        email: record.fields['Email'] || '',
        phone: record.fields['Phone'] || '',
        status: record.fields['Status'] || 'New',
        source: record.fields['Source'] || '',
        capturedDate: record.fields['Captured Date'] || '',
        interest: record.fields['Interest'] || '',
        location: record.fields['Location'] || '',
        notes: record.fields['Notes'] || '',
        questions: record.fields['Questions'] || '[]'
      }));

      // Fetch bookings for this client
      const bookingsRecords = await base('Bookings')
        .select({
          filterByFormula: `{Client ID} = '${clientId}'`
        })
        .all();

      const bookings = bookingsRecords.map(record => ({
        id: record.id,
        customerName: record.fields['Customer Name'] || '',
        email: record.fields['Email'] || '',
        phone: record.fields['Phone'] || '',
        service: record.fields['Service'] || '',
        bookingDate: record.fields['Booking Date'] || '',
        bookingTime: record.fields['Booking Time'] || '',
        status: record.fields['Status'] || 'Pending',
        value: record.fields['Value'] || 0,
        notes: record.fields['Notes'] || ''
      }));

      return res.status(200).json({
        success: true,
        leads,
        bookings
      });
    }

    // Unknown action
    return res.status(400).json({
      error: 'Invalid action. Use "login" or "getDashboard"',
      success: false
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      success: false
    });
  }
};
