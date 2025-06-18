import {SpaDevices} from './models/spa-devices';
import mojo, {yamlConfigPlugin} from '@mojojs/core';

export const app = mojo();

app.plugin(yamlConfigPlugin);
app.secrets = app.config.secrets;
app.onStart( async app => {
    if (app.models.spaDevices === undefined) {
        app.models.spaDevices = new SpaDevices();
    }
});

app.get('/').to('example#welcome');
app.get('/spa-devices', {ext: ['html', 'json']}).to('spa-devices#index');
app.get('/spa-devices/create', {ext: ['html', 'json']}).to('spa-devices#create').name('create_spa_device');
app.post('/spa-devices', {ext: ['html', 'json']}).to('spa-devices#store').name('store_spa_device');
app.get('/spa-devices/:id', {ext: ['html', 'json']}).to('spa-devices#show').name('show_spa_device');
app.get('/spa-devices/:id/edit', {ext: ['html', 'json']}).to('spa-devices#edit').name('edit_spa_device');
app.put('/spa-devices/:id', {ext: ['html', 'json']}).to('spa-devices#update').name('update_spa_device');
app.delete('/spa-devices/:id', {ext: ['html', 'json']}).to('spa-devices#remove').name('remove_spa_device');
app.start();
