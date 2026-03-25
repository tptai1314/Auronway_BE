const organizersService = require("./organizers.service");

class OrganizersController {
  async createOrganizer(req, res) {
    try {
      const organizer = await organizersService.createOrganizer(
        req.user,
        req.body
      );
      res.status(201).json({ success: true, organizer });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getOrganizers(req, res) {
    try {
      const organizers = await organizersService.getOrganizers(
        req.query.tenantId
      );
      res.json({ success: true, organizers });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getOrganizerDetail(req, res) {
    try {
      const organizerId = req.params.id;
      const organizer = await organizersService.getOrganizerDetail(organizerId);
      res.json({ success: true, organizer });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async updateOrganizer(req, res) {
    try {
      const organizerId = req.params.id;
      const updated = await organizersService.updateOrganizer(
        organizerId,
        req.body
      );
      res.json({ success: true, organizer: updated });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async disableOrganizer(req, res) {
    try {
      const organizerId = req.params.id;
      const updated = await organizersService.disableOrganizer(organizerId);
      res.json({ success: true, organizer: updated });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message });
    }
  }

  async updateReviewers(req, res) {
    try {
      const organizerId = req.params.id;
      const { reviewers } = req.body;
      const updated = await organizersService.updateReviewers(
        organizerId,
        reviewers
      );
      res.json({ success: true, organizer: updated });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateApprovers(req, res) {
    try {
      const organizerId = req.params.id;
      const { approvers } = req.body;
      const updated = await organizersService.updateApprovers(
        organizerId,
        approvers
      );
      res.json({ success: true, organizer: updated });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getOrganizerEvents(req, res) {
    try {
      const organizerId = req.params.id;
      const events = await organizersService.getOrganizerEvents(
        organizerId,
        req.query
      );
      res.json({ success: true, events });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  
  async getMyOrganizers(req, res) {
    try {
      const userId = req.user._id;
      const organizers = await organizersService.getMyOrganizers(userId);
      res.json({ success: true, organizers });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  async addMember(req, res) {
    try {
      const organizerId = req.params.id;
      const { user_id, role } = req.body;
      const organizer = await organizersService.addMember(organizerId, user_id, role);
      res.status(201).json({ success: true, organizer });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  
  // ==========================================
  // ORGANIZER AUTHENTICATION
  // ==========================================
  
  async createOrganizerAccount(req, res) {
    try {
      const organizerId = req.params.id;
      const result = await organizersService.createOrganizerAccount(
        req.user, 
        organizerId, 
        req.body
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  
  async loginOrganizer(req, res) {
    try {
      const { email, password } = req.body;
      const result = await organizersService.loginOrganizer(email, password);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(401).json({ success: false, message: error.message });
    }
  }
  
  async changeOrganizerPassword(req, res) {
    try {
      const organizerId = req.organizer._id; // Từ middleware authenticate organizer
      const { old_password, new_password } = req.body;
      const result = await organizersService.changeOrganizerPassword(
        organizerId,
        old_password,
        new_password
      );
      res.json({ success: true, message: result.message });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  
  // ==========================================
  // MEMBER MANAGEMENT
  // ==========================================
  
  async getOrganizerMembers(req, res) {
    try {
      const organizerId = req.params.id;
      const result = await organizersService.getOrganizerMembers(organizerId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  
  async addOrganizerMember(req, res) {
    try {
      const organizerId = req.params.id;
      const { user_id, role } = req.body;
      const result = await organizersService.addOrganizerMember(
        req.user,
        organizerId,
        user_id,
        role
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  
  async removeOrganizerMember(req, res) {
    try {
      const organizerId = req.params.id;
      const userId = req.params.userId;
      const result = await organizersService.removeOrganizerMember(
        req.user,
        organizerId,
        userId
      );
      res.json({ success: true, message: result.message });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
  
  async updateOrganizerPrivacy(req, res) {
    try {
      const organizerId = req.params.id;
      const { is_private } = req.body;
      const result = await organizersService.updateOrganizerPrivacy(
        req.user,
        organizerId,
        is_private
      );
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new OrganizersController();
