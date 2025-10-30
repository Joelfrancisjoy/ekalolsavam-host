const http = require('http');

function checkServer(url, name) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      console.log(`✅ ${name} is running at ${url}`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${name} is not running at ${url}`);
      console.log(`   Error: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏰ ${name} timeout at ${url}`);
      resolve(false);
    });
  });
}

async function checkAllServers() {
  console.log('🔍 Checking servers...\n');
  
  const backend = await checkServer('http://localhost:8000', 'Backend');
  const frontend = await checkServer('http://localhost:3000', 'Frontend');
  
  console.log('\n📊 Summary:');
  if (backend && frontend) {
    console.log('✅ All servers are running! You can now run: npm test');
  } else {
    console.log('❌ Some servers are not running. Please start them first:');
    if (!backend) {
      console.log('   Backend: cd backend && python manage.py runserver');
    }
    if (!frontend) {
      console.log('   Frontend: cd frontend && npm start');
    }
  }
}

checkAllServers();


