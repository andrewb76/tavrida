import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/',
    component: ComponentCreator('/', '851'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '90f'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '4d3'),
            routes: [
              {
                path: '/architecture',
                component: ComponentCreator('/architecture', 'c5a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/getting-started',
                component: ComponentCreator('/getting-started', '23e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/overview',
                component: ComponentCreator('/overview', '7d0'),
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
