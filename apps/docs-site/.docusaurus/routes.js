import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/',
    component: ComponentCreator('/', '9eb'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', 'bad'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '52b'),
            routes: [
              {
                path: '/architecture/cicd-swarm',
                component: ComponentCreator('/architecture/cicd-swarm', '9c5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/intro',
                component: ComponentCreator('/intro', '9fa'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/modules/webhooks-service',
                component: ComponentCreator('/modules/webhooks-service', '1bd'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/modules/websocket-gateway',
                component: ComponentCreator('/modules/websocket-gateway', '180'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
