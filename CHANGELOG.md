# Changelog

## [0.4.0](https://github.com/crraay/ai-for-developers-project-386/compare/v0.3.0...v0.4.0) (2026-11-14)


### Features

* **frontend:** replace Angular with React and Vite ([7fd51ed](https://github.com/crraay/ai-for-developers-project-386/commit/7fd51eda5d5a68351615d15ff1d6ef78a12b05f0))


### Bug Fixes

* **backend:** hide referenced booking types on delete ([b810424](https://github.com/crraay/ai-for-developers-project-386/commit/b8104249ad388b1d6a646f16519de78b2c785e82))
* **ci:** keep release-please running on the default branch ([da9cb31](https://github.com/crraay/ai-for-developers-project-386/commit/da9cb311e01988b94cbde36878e3411300b0251d))
* **ci:** keep release-please running on the default branch ([3073e47](https://github.com/crraay/ai-for-developers-project-386/commit/3073e4795acc8dc6470b5ee2d9765c1d28fa7c3d)), closes [#46](https://github.com/crraay/ai-for-developers-project-386/issues/46)

## [0.3.0](https://github.com/crraay/ai-for-developers-project-386/compare/v0.2.0...v0.3.0) (2026-11-13)


### Features

* **backend:** derive booking duration from a chosen booking type ([23c1fae](https://github.com/crraay/ai-for-developers-project-386/commit/23c1fae096389946eb6522546f1e09f8b6bea81a))
* **backend:** resolve the picked slot day in the guest's timezone ([06b2273](https://github.com/crraay/ai-for-developers-project-386/commit/06b2273832a517e19cdcd16d93ca68c638364921)), closes [#1](https://github.com/crraay/ai-for-developers-project-386/issues/1)
* deploy to Render through a manual GitHub workflow ([1731949](https://github.com/crraay/ai-for-developers-project-386/commit/1731949975cf0bf2a7d98306cea283cf8c0d7715))
* **frontend:** host can manage booking types and guest picks one ([cb61b46](https://github.com/crraay/ai-for-developers-project-386/commit/cb61b465ed5a54286dc7ad5fecfedcd1db5d54f5))
* **frontend:** keep host tables scrollable and explain invalid emails ([173e2e1](https://github.com/crraay/ai-for-developers-project-386/commit/173e2e168af79ea614f6889ed8f1a3cde03725ca))
* **frontend:** send the browser timezone and open on the guest's today ([e5781b3](https://github.com/crraay/ai-for-developers-project-386/commit/e5781b3be0582697a0ff1a2df66889442ba3ed0a)), closes [#1](https://github.com/crraay/ai-for-developers-project-386/issues/1)
* make the 14-day booking window include today ([44a9de3](https://github.com/crraay/ai-for-developers-project-386/commit/44a9de3ec60c28a69fc47f6514164a60d4390382))
* narrow the booking horizon from 90 days to 14 days ([b8da138](https://github.com/crraay/ai-for-developers-project-386/commit/b8da138763f627643661f3e6dd4cbff449025c51))
* one 14-calendar-day booking window across UI and server ([4499a18](https://github.com/crraay/ai-for-developers-project-386/commit/4499a189465595938400a3ac402f706ab539422d)), closes [#29](https://github.com/crraay/ai-for-developers-project-386/issues/29)
* serve frontend and backend from a root image on $PORT ([23537d8](https://github.com/crraay/ai-for-developers-project-386/commit/23537d8883f33e4a13606285fbf23ce77361e684))
* typespec contract source, 201 assertion, browser test ([1150819](https://github.com/crraay/ai-for-developers-project-386/commit/1150819cdb79c8aeb7a920deb543dcf711c06875))
* widen allowed durations to 15/30/60 and test partial overlaps ([53f5ed8](https://github.com/crraay/ai-for-developers-project-386/commit/53f5ed82ae0dc87a7cb4aff5a00cd2d10ab8aec9))


### Bug Fixes

* address the follow-up review findings ([ba026aa](https://github.com/crraay/ai-for-developers-project-386/commit/ba026aabfb7dc980119ab66ba04ef83c84fb6d5f))
* address the two-axis review findings ([dc94ada](https://github.com/crraay/ai-for-developers-project-386/commit/dc94ada1e899915684f85bbb7de67875c56c6b11)), closes [#1](https://github.com/crraay/ai-for-developers-project-386/issues/1) [#38](https://github.com/crraay/ai-for-developers-project-386/issues/38)
* **backend:** reject partially overlapping bookings in the database ([435efb2](https://github.com/crraay/ai-for-developers-project-386/commit/435efb26c38b27e082e2ce644f1d2b504a426e09)), closes [#31](https://github.com/crraay/ai-for-developers-project-386/issues/31)
* **backend:** validate type duration against the 5-240 range ([5b78b98](https://github.com/crraay/ai-for-developers-project-386/commit/5b78b986f8e0fccfe5a0090d50ce9aa2a2d1ed15)), closes [#28](https://github.com/crraay/ai-for-developers-project-386/issues/28)
* **frontend:** refuse to submit a booking without a chosen type ([84a93d2](https://github.com/crraay/ai-for-developers-project-386/commit/84a93d2cf5a26206fc3d8c51e443912bb2eb32bd)), closes [#28](https://github.com/crraay/ai-for-developers-project-386/issues/28)
* id-specific 404 description and robust e2e teardown ([783f28d](https://github.com/crraay/ai-for-developers-project-386/commit/783f28d5f9498d49d7ab73f7336b36bee20a9c8c)), closes [#32](https://github.com/crraay/ai-for-developers-project-386/issues/32)
* **smoke:** book by bookingTypeId instead of the retired durationMinutes ([2f413f8](https://github.com/crraay/ai-for-developers-project-386/commit/2f413f8578f3602bf64c8c0369e6c2954cbbc9d7)), closes [#28](https://github.com/crraay/ai-for-developers-project-386/issues/28)
* **smoke:** clarify cache-mount mode in backend Dockerfile ([7817630](https://github.com/crraay/ai-for-developers-project-386/commit/781763003d548e832d750d252cb6bf102594a074))
* **smoke:** persist gradle cache across CI runs ([5bb7e8e](https://github.com/crraay/ai-for-developers-project-386/commit/5bb7e8ea3f2919d86001bd976460831426f25bf5))
* **smoke:** persist gradle cache across CI runs ([fc50944](https://github.com/crraay/ai-for-developers-project-386/commit/fc509443e851345c2bed5def321babe365fd967e))

## [0.2.0](https://github.com/crraay/ai-for-developers-project-386/compare/v0.1.0...v0.2.0) (2026-11-08)


### Features

* **backend:** book slots over seeded weekday availability ([fa963d4](https://github.com/crraay/ai-for-developers-project-386/commit/fa963d441e43e5c405d0c3ddc69468fad088578b))
* **backend:** generate OpenAPI spec at compile time and export to openapi/api.yml ([246c986](https://github.com/crraay/ai-for-developers-project-386/commit/246c9863ce720ceb20ff2e6ffd7b29845521eb62))
* **frontend:** generate typed API client from openapi/api.yml via ng-openapi-gen ([5c75f4b](https://github.com/crraay/ai-for-developers-project-386/commit/5c75f4b981f66342fe8d0d9c23142dcf33d6af23))
* **frontend:** guest booking pages on the typed API client ([2a425e6](https://github.com/crraay/ai-for-developers-project-386/commit/2a425e62e8410127695aaf811b5662af5677b669))
* **frontend:** introduction landing page at the root route ([a2d10c1](https://github.com/crraay/ai-for-developers-project-386/commit/a2d10c1ffd70018fd2b5d9d90fb1841e6c4ed4b2))
* **host-view:** list upcoming bookings with host cancel and filter bubbles ([175a733](https://github.com/crraay/ai-for-developers-project-386/commit/175a73341178ac04b2c38a3b32144bb4c773b5ce))
* **release:** adopt release-please pinned at v0.1.0 ([d46fb17](https://github.com/crraay/ai-for-developers-project-386/commit/d46fb179b4e12c51441bdb1929508e2deccd8915))
* **release:** adopt release-please with v0.1.0 start and lint PR titles ([3a2401e](https://github.com/crraay/ai-for-developers-project-386/commit/3a2401e83dbdfda148cd7f68e926f7a6ad482ace))
* scaffold project skeleton (Angular 22 + Micronaut 5/Java 25 + PostgreSQL) ([f50bc6d](https://github.com/crraay/ai-for-developers-project-386/commit/f50bc6dbaa5eca55832541008fa165e6f797197c))


### Bug Fixes

* **check:** regenerate the OpenAPI spec clean-room ([4787ca0](https://github.com/crraay/ai-for-developers-project-386/commit/4787ca0fa724aebe9c622e2ce977dcf7517ddb01))
* executable bit on gradlew ([5e7ecdb](https://github.com/crraay/ai-for-developers-project-386/commit/5e7ecdb51947e3e533a38b6ea7e26edbfd7f0f17))
* **frontend:** restore the angular HTML parser override in .prettierrc ([3d189b6](https://github.com/crraay/ai-for-developers-project-386/commit/3d189b6da42417d84b692716828d937a68e07d91))
* keep betterleaks off the gitignored Gradle cache ([3877f2e](https://github.com/crraay/ai-for-developers-project-386/commit/3877f2e1cdb98a427f034e842f768c28d0d624ed))
* pin LF line endings for committed generated files ([ec9a7a6](https://github.com/crraay/ai-for-developers-project-386/commit/ec9a7a6ae110a0daaf131783855896e7aaa2e375))
* single-line smoke scripts ([95f6329](https://github.com/crraay/ai-for-developers-project-386/commit/95f632935c137329c44d64b67d46a0370b16d55f))
* **smoke:** survive days whose slots response is empty ([1370cfe](https://github.com/crraay/ai-for-developers-project-386/commit/1370cfee1015dc2bf16721dc19dd2b0059755d7c))

## Changelog
