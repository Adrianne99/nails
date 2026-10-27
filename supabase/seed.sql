-- Illustrative starter designs; replace with Eurie's actual catalog before launch.
insert into public.designs(id,name,description,category,price,color,pattern) values
('10000000-0000-4000-8000-000000000001','Blush Hour','A sheer blush base with a delicate milky French tip. Your everyday little luxury.','Everyday',20000,'#e9b9be','french'),
('10000000-0000-4000-8000-000000000002','Petal Poetry','Tiny hand-painted daisies on a soft rose canvas. A little garden at your fingertips.','Floral',25000,'#dc9ba9','flower'),
('10000000-0000-4000-8000-000000000003','Pearl Intentions','Creamy pearl tones and delicate golden details for your dressed-up days.','Occasion',30000,'#e8d9bf','pearl'),
('10000000-0000-4000-8000-000000000004','Cherry on Top','Playful cherries and a rosy finish. Sweet, with a little personality.','Playful',25000,'#ecc6c3','cherry'),
('10000000-0000-4000-8000-000000000005','Berry Yours','A glossy berry shade that makes even the simplest outfit feel considered.','Everyday',20000,'#9b405e','solid'),
('10000000-0000-4000-8000-000000000006','Golden Reverie','A warm champagne shimmer, made for catching the light.','Occasion',28000,'#c7a877','shimmer') on conflict(id) do nothing;
