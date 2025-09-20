# Oracle

- https://signup.cloud.oracle.com/
- M-A used Toronto
- https://www.oracle.com/ca-en/cloud/free/
    - Storage: Up to 2 block volumes, 200 GB
    - ARM: 4x CPU, 24GB RAM
    - AMD: 1/8 CPU, 1GB RAM


## Create a VM

- Name: wapidou-1
- Shape
    - ARM
        - Image: Ubuntu 24.04 Minimal aarch64
        - VM.Standard.A1.Flex
            - 3.0GHz Ampere Altra
            - 1Gpbs
            - Max 2 VNICs (virtual network interface card)
            - OCPUs: 4
            - Memory: 24GB
    - AMD
        - Image: Ubuntu 24.04 Minimal
        - VM.Standard.E2.1.Micro
            - 2.0GHz EPYC 7551
            - 0.48Gpb
            - Max 1 VNIC
- Availability configuration: Send maintenance notifications (aka disable live migration)
- Advanced options
    - Instance metadata service: require authorization header
    - Choose cloud-init script (later)
    - Oracle Cloud Agent: 
        - Uncheck "Cloud Guard Workload Protection" https://www.oracle.com/security/cloud-security/cloud-guard/
- Security
    - Meh
- Networking
    - VNIC: wapidou-1-nic
    - VNC: wapidou-1-vcn
    - Create a new public subnet
        - wapidou-1-subnet
        - 10.0.0.0/24
    - "To have the full range of options, Create a VCN and Create a Subnet and then select an existing VCN and
      subnet when you create a compute instance."
    - Hardware-assisted (SR-IOV) networking; errors out.
    - Add SSH keys: uploaded mine. Supports multiple.
- Storage
    - Default boot volume is 46.6GB.

After provisioning is done

- https://cloud.oracle.com
- Go to the VM
- Networking
- Get the IP address.
- Primary VNIC
    - Edit VNIC
    - Check: Skip source/destination check
- VCN
    - Ingress Rules
    - For TCP & UDP; open all ports (the VM has a firewall anyway)
        - Source: 0.0.0.0/0
        - Source range: All
        - Destination: All
- http://40.233.68.60

Run:

```bash
./connect.sh 40.233.68.60
```
