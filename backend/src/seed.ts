import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Site } from './schemas/site.schema';
import { Visit } from './schemas/visit.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const siteModel = app.get<Model<Site>>(getModelToken(Site.name));
  const visitModel = app.get<Model<Visit>>(getModelToken(Visit.name));

  console.log('🌱 Seeding database...');

  //Cleearing any existing data to ensure running twice doesn't duplicate or crash
  await userModel.deleteMany({});
  await siteModel.deleteMany({});
  await visitModel.deleteMany({});
  console.log('🧹 Cleared existing database records.');
  const users = await userModel.create([
    { name: 'Alice' },
    { name: 'Bob' },
  ]);
  console.log(`👤 Inserted ${users.length} users.`);
  const sites = await siteModel.create([
    {
      address: 'tidepool.zz',
      title: 'The Tidepool Archives',
      body: `<h1>Welcome to Tidepool</h1><p>The water is cold and clear today. You can peer down and see the reflections of ancient shells.</p><p>Venture further into the network via <a href="beacon.zz">Beacon</a> or check out the quiet <a href="whisper.zz">Whisper Network</a>.</p><p>Or visit a page that time forgot: <a href="ghost-harbor.zz">Ghost Harbor (Broken Link)</a>.</p>`,
      author: 'Alice',
    },
    {
      address: 'beacon.zz',
      title: 'The Coastal Beacon',
      body: `<h1>Beacon Tower</h1><p>A flashing light guides travelers across the small web. Signals bounce from node to node.</p><p>Return to the <a href="tidepool.zz">Tidepool Archives</a> or push onward to the <a href="lighthouse.zz">Lighthouse</a>.</p>`,
      author: 'Bob',
    },
    {
      address: 'lighthouse.zz',
      title: 'Distant Lighthouse',
      body: `<h1>The Lighthouse</h1><p>Perched high on the cliffs. From up here, you can see all of the small web stretching out.</p><p>Go back to <a href="beacon.zz">Beacon</a> or explore the <a href="glass.zz">Glass House</a>.</p>`,
      author: 'Alice',
    },
    {
      address: 'glass.zz',
      title: 'The Glass House',
      body: `<h1>Glass Architecture</h1><p>Everything here is transparent, fragile, and meticulously indexed.</p><p>Return to the <a href="lighthouse.zz">Lighthouse</a> or visit <a href="ember.zz">Ember Hearth</a>.</p>`,
      author: 'Bob',
    },
    {
      address: 'ember.zz',
      title: 'Ember Hearth',
      body: `<h1>Warmth in the Small Web</h1><p>A cozy digital fireplace where travelers rest their feet.</p><p>Head back to the <a href="glass.zz">Glass House</a> or wander into the <a href="moss.zz">Mossy Woods</a>.</p>`,
      author: 'Alice',
    },
    {
      address: 'whisper.zz',
      title: 'The Whisper Network',
      body: `<h1>Quiet Conduits</h1><p>Messages passed softly through underground copper cables. Nobody screams here.</p><p>Go back to <a href="tidepool.zz">Tidepool</a> or check out <a href="orbit.zz">Orbit Station</a>.</p>`,
      author: 'Bob',
    },
    {
      address: 'moss.zz',
      title: 'Mossy Woods',
      body: `<h1>Under the Canopy</h1><p>Soft green moss covers every server rack. Nature has reclaimed the hardware.</p><p>Return to <a href="ember.zz">Ember Hearth</a> or walk to <a href="nexus.zz">The Nexus</a>.</p>`,
      author: 'Alice',
    },
    {
      address: 'orbit.zz',
      title: 'Orbit Station',
      body: `<h1>High Altitude Node</h1><p>Looking down at the text files spinning below in orbit.</p><p>Go back to <a href="whisper.zz">The Whisper Network</a> or visit <a href="nexus.zz">The Nexus</a>.</p>`,
      author: 'Bob',
    },
    {
      address: 'nexus.zz',
      title: 'The Nexus',
      body: `<h1>Central Hub</h1><p>Where multiple pathways converge into a single stream of text.</p><p>You can loop back to <a href="moss.zz">Mossy Woods</a> or test a dead end: <a href="void.zz">The Void (Broken Link)</a>.</p>`,
      author: 'Alice',
    },
    {
      address: 'archive.zz',
      title: 'Deep Archive',
      body: `<h1>The Old Vault</h1><p>Dusty records of early web experiments. Rarely visited, but full of history.</p><p>Head back to the beginning at <a href="tidepool.zz">Tidepool Archives</a>.</p>`,
      author: 'Bob',
    },
  ]);
  console.log(`📄 Inserted ${sites.length} sample sites.`);
  const aliceUser = users.find(u => u.name === 'Alice');
  const bobUser = users.find(u => u.name === 'Bob');

  if (!aliceUser || !bobUser) {
    throw new Error('Seed users were not created properly.');
  }

  const aliceId = aliceUser._id;
  const bobId = bobUser._id;

  await visitModel.create([
    //like Alice's trail: tidepool -> beacon -> lighthouse -> glass
    { userId: aliceId, address: 'tidepool.zz', navigationMethod: 'typed', timestamp: new Date(Date.now() - 3600000) },
    { userId: aliceId, address: 'beacon.zz', navigationMethod: 'link', timestamp: new Date(Date.now() - 3000000) },
    { userId: aliceId, address: 'lighthouse.zz', navigationMethod: 'link', timestamp: new Date(Date.now() - 2400000) },
    { userId: aliceId, address: 'glass.zz', navigationMethod: 'link', timestamp: new Date(Date.now() - 1800000) },
    { userId: bobId, address: 'orbit.zz', navigationMethod: 'typed', timestamp: new Date(Date.now() - 5000000) },
    { userId: bobId, address: 'whisper.zz', navigationMethod: 'link', timestamp: new Date(Date.now() - 4000000) },
    { userId: bobId, address: 'tidepool.zz', navigationMethod: 'link', timestamp: new Date(Date.now() - 2000000) },
  ]);
  console.log('Inserted initial browsing history.');

  console.log('Database seeding completed successfully!');
  await app.close();
  process.exit(0);
}

bootstrap().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});