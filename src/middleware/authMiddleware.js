const jwt = require('jsonwebtoken');
const { userModel } = require('../models/userModel');

// ["Admin", "Agent", "Traveler", "Guest"]
const routePermissions = [
    //agents
    { path: '/api/agents/', method: 'POST', roles: ['Admin', 'Agent'], exact: true },
    { path: '/api/agents/', method: 'GET', roles: ['Admin'], exact: true },
    { path: '/api/agents/:id', method: 'PATCH', roles: ['Admin'] },
    { path: '/api/agents/:id', method: 'GET', roles: ['Admin', 'Traveler', "Agent", "Guest"] },
    { path: '/api/agents/:id', method: 'PUT', roles: ['Admin', 'Agent'] },
    { path: '/api/agents/:id', method: 'DELETE', roles: ['Admin'] },

    //banner
    { path: '/api/banner/', method: 'POST', roles: ['Admin'], exact: true },
    { path: '/api/banner/', method: 'GET', roles: ['Admin', 'Traveler', "Agent", "Guest"], exact: true },
    { path: '/api/banner/:id', method: 'PUT', roles: ['Admin'] },
    { path: '/api/banner/:id', method: 'DELETE', roles: ['Admin'] },

    //blogs
    { path: '/api/blogs/', method: 'POST', roles: ['Admin'], exact: true },
    { path: '/api/blogs/:id', method: 'PUT', roles: ['Admin'] },
    { path: '/api/blogs/:id', method: 'DELETE', roles: ['Admin'] },

    //cities
    { path: '/api/cities/', method: 'POST', roles: ['Admin'], exact: true },
    { path: '/api/cities/:id', method: 'PUT', roles: ['Admin'] },
    { path: '/api/cities/:id/disable', method: 'PATCH', roles: ['Admin'] },
    { path: '/api/cities/:id', method: 'DELETE', roles: ['Admin'] },

    //countries
    { path: '/api/countries/', method: 'POST', roles: ['Admin'], exact: true },
    { path: '/api/countries/:id', method: 'PUT', roles: ['Admin'] },
    { path: '/api/countries/:id/disable', method: 'PATCH', roles: ['Admin'] },

    //contact us

    { path: '/api/contactUs/', method: 'POST', roles: ['Admin', 'Traveler', "Agent"], exact: true },
    { path: '/api/contactUs/', method: 'GET', roles: ['Admin'], exact: true },
    { path: '/api/contactUs/:id', method: 'GET', roles: ['Admin', 'Traveler', "Agent"] },

    //faqs    
    { path: '/api/faq/', method: 'POST', roles: ['Admin'], exact: true },
    { path: '/api/faq/:id', method: 'PUT', roles: ['Admin'] },
    { path: '/api/faq/:id', method: 'DELETE', roles: ['Admin'] },

    //guide allocations

    { path: '/api/guide-allocations/', method: 'POST', roles: ['Admin'], exact: true },
    { path: '/api/guide-allocations/', method: 'GET', roles: ['Admin'], exact: true },
    { path: '/api/guide-allocations/:id', method: 'GET', roles: ['Admin', "Agent"] },
    { path: '/api/guide-allocations/:id', method: 'PUT', roles: ['Admin'] },
    { path: '/api/guide-allocations/:id', method: 'DELETE', roles: ['Admin'] },
    { path: '/api/guide-allocations/:id/transfer', method: 'POST', roles: ['Admin'] },

    //packages

    { path: '/api/packages/', method: 'POST', roles: ['Admin'], exact: true },
    { path: '/api/packages/:id/duplicate', method: 'POST', roles: ['Admin'] },
    { path: '/api/packages/:id/disable', method: 'PATCH', roles: ['Admin'] },
    { path: '/api/packages/:id', method: 'DELETE', roles: ['Admin'] },
    { path: '/api/packages/:id', method: 'PUT', roles: ['Admin'] },


    //place

    { path: '/api/places/', method: 'POST', roles: ['Admin'], exact: true },
    { path: '/api/places/:id', method: 'PUT', roles: ['Admin'] },
    { path: '/api/places/:id/disable', method: 'PATCH', roles: ['Admin'] },
    { path: '/api/places/:id', method: 'DELETE', roles: ['Admin'] },

    // review
    { path: '/api/review/', method: 'POST', roles: ['Admin', 'Agent', 'Traveler'], exact: true },
    { path: '/api/review/:userId/:placeId', method: 'DELETE', roles: ['Admin', 'Agent', 'Traveler'] },

    //state
    { path: '/api/states/', method: 'POST', roles: ['Admin'], exact: true },
    { path: '/api/states/:id', method: 'PUT', roles: ['Admin'] },
    { path: '/api/states/:id/disable', method: 'PATCH', roles: ['Admin'] },
    //tour
    { path: '/api/tours/', method: 'POST', roles: ['Admin'], exact: true },
    { path: '/api/tours/:id', method: 'PUT', roles: ['Admin'] },
    { path: '/api/tours/toggle/:id', method: 'PATCH', roles: ['Admin'] },
    { path: '/api/tours/:id/status', method: 'PATCH', roles: ['Admin'] },
    { path: '/api/tours/:id/', method: 'DELETE', roles: ['Admin'] },

    //users

    { path: '/api/users/', method: 'GET', roles: ['Admin'], exact: true },
    { path: '/api/users/', method: 'POST', roles: ['Admin', 'Traveler', 'Agent'], exact: true },
    { path: '/api/users/:id', method: 'PUT', roles: ['Admin', 'Traveler', 'Agent'] },
    { path: '/api/users/:id/disable', method: 'PATCH', roles: ['Admin'] },

    //wishlist routes
    { path: '/api/wishlist/', method: 'POST', roles: ['Admin', 'Traveler', 'Agent'], exact: true },
    { path: '/api/wishlist/:id', method: 'GET', roles: ['Admin', 'Traveler', 'Agent'] },

    //bookings

    { path: '/api/bookings/', method: 'POST', roles: ['Admin'], exact: true },
    { path: '/api/bookings/', method: 'GET', roles: ['Admin'], exact: true },
    { path: '/api/bookings/user', method: 'GET', roles: ['Admin', 'Traveler','Agent'], exact: true },
    { path: '/api/bookings/:id', method: 'PUT', roles: ['Admin'] },
    { path: '/api/bookings/:id', method: 'DELETE', roles: ['Admin'] },
    { path: '/api/bookings/:id/disable', method: 'PATCH', roles: ['Admin'] },

    //invoice

    { path: '/api/invoices/generate/:bookingId', method: 'POST', roles: ['Admin'] },
    { path: '/api/invoices/regenerate/:bookingId', method: 'PUT', roles: ['Admin'] },


]



function matchPath(completePath, routePath, exact = false) {
    if (exact) {
        return completePath === routePath;
    }

    const pattern = routePath
        .replace(/\//g, '\\/')
        .replace(/:\w+/g, '[^/]+');

    // console.log("Pattern:", pattern);
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(completePath);
}

exports.protect = async (req, res, next) => {
    try {

        const method = req.method;
        const currentPath = req.baseUrl + req.path;
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {

            return res.status(401).json({ success: false, message: "Not authorized, token missing" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // console.log("Decoded Token:", decoded);
        // console.log(decoded)
        const user = await userModel.findById(decoded.userId)
            .select('-password -__v')
            .lean();

        // if (user.role == 'Agent' ) {
        //     return res.status(403).json({
        //         success: false,
        //         message: `Access denied. agent is not verified`
        //     });

        // }


        req.user = {
            userId: decoded.userId,
            role: user.role,

        }
        // console.log(req.user)

        // const matchedUrl = routePermissions.find(route => currentPath.startsWith(route.path) && route.method === method);
        const matchedRoute = routePermissions.find(route => {
            return matchPath(currentPath, route.path, route.exact) && route.method === method;
        });
   const isAgentCreationRoute = currentPath === '/api/agents/' && method === 'POST';
        
        if (user.role === 'Agent' && !isAgentCreationRoute && user.isVerified === false) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Agent is not verified`
            });
        }


        // if (matchedUrl) {
        //     if (!matchedUrl.roles.includes(user.role)) {
        //         return res.status(403).json({success:false, message: "Forbidden: You don't have permission to access this resource",status:403 });
        //     }

        // }
        if (matchedRoute) {
            // console.log("Matched Route:", matchedRoute.path);
            if (!matchedRoute.roles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,

                    message: `Access denied. Required role: ${matchedRoute.roles.join(' or ')}`
                });
            }
        }




        next();
    } catch (err) {
        return res.status(401).json({ message: "Not authorized, invalid token" });
    }
};
