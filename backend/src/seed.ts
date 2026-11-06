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

  const users = await Promise.all(
    ['Alice', 'Bob', 'Casey', 'Drew'].map((name) =>
      userModel.findOneAndUpdate({ name }, { $set: { name } }, { upsert: true, new: true }),
    ),
  );
  console.log(`👤 Inserted ${users.length} users.`);
  const siteDefinitions = [
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
  ];
  await Promise.all(siteDefinitions.map((site) =>
    siteModel.updateOne({ address: site.address }, { $set: site }, { upsert: true }),
  ));
  console.log(`📄 Upserted ${siteDefinitions.length} sample sites.`);
  const aliceUser = users.find(u => u.name === 'Alice');
  const bobUser = users.find(u => u?.name === 'Bob');
  const caseyUser = users.find(u => u?.name === 'Casey');
  const drewUser = users.find(u => u?.name === 'Drew');

  if (!aliceUser || !bobUser || !caseyUser || !drewUser) {
    throw new Error('Seed users were not created properly.');
  }

  const aliceId = aliceUser._id;
  const bobId = bobUser._id;
  const caseyId = caseyUser._id;
  const drewId = drewUser._id;

  await visitModel.deleteMany({ seedKey: /^mini-browser:/ });
  const start = Date.parse('2025-01-15T12:00:00.000Z');
  const trails = [
    [aliceId, ['tidepool.zz', 'beacon.zz', 'lighthouse.zz', 'glass.zz', 'ember.zz', 'moss.zz', 'nexus.zz', 'archive.zz', 'tidepool.zz', 'whisper.zz', 'orbit.zz', 'nexus.zz', 'beacon.zz', 'lighthouse.zz', 'tidepool.zz', 'archive.zz']],
    [bobId, ['orbit.zz', 'whisper.zz', 'tidepool.zz', 'beacon.zz', 'tidepool.zz', 'archive.zz', 'nexus.zz']],
    [caseyId, ['archive.zz', 'tidepool.zz', 'whisper.zz', 'orbit.zz', 'nexus.zz', 'moss.zz']],
    [drewId, ['lighthouse.zz', 'glass.zz', 'ember.zz', 'glass.zz', 'beacon.zz']],
  ] as const;
  const visits = trails.flatMap(([userId, addresses], userIndex) => addresses.map((address, visitIndex) => ({
    userId,
    address,
    navigationMethod: visitIndex === 0 ? 'typed' : visitIndex === 4 && userIndex === 1 ? 'back' : 'link',
    timestamp: new Date(start + (userIndex * 12 + visitIndex * 4) * 60_000),
    seedKey: `mini-browser:${userIndex}:${visitIndex}`,
  })));
  await visitModel.insertMany(visits);
  console.log(`Inserted ${visits.length} deterministic browsing history records.`);

  console.log('Database seeding completed successfully!');
  await app.close();
  process.exit(0);
}

bootstrap().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});